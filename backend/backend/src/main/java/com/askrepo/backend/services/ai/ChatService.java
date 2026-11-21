package com.askrepo.backend.services.ai;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executor;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.askrepo.backend.dto.SourceRef;
import com.askrepo.backend.entity.ChatMessage;
import com.askrepo.backend.entity.ChatRole;
import com.askrepo.backend.entity.IndexStatus;
import com.askrepo.backend.entity.Repository;
import com.askrepo.backend.exceptions.BadRequestException;
import com.askrepo.backend.exceptions.ConflictException;
import com.askrepo.backend.services.RepoService;

import lombok.extern.slf4j.Slf4j;
import reactor.core.Disposable;

@Service
@Slf4j
public class ChatService {
    public static final int MAX_QUESTION_LENGTH = 4000;
    private static final int MAX_ERROR_MESSAGE_LENGTH = 300;
    private static final String INTERRUPTED_SUFFIX = "\n\n_(response interrupted)_";

    private final RepoService repoService;
    private final ChatHistoryService historyService;
    private final RetrievalService retrievalService;
    private final PromptBuilder promptBuilder;
    private final ChatClient chatClient;
    private final Executor chatExecutor;

    public ChatService(
        RepoService repoService,
        ChatHistoryService historyService,
        RetrievalService retrievalService,
        PromptBuilder promptBuilder,
        ChatClient chatClient,
        @Qualifier("chatExecutor") Executor chatExecutor
    ) {
        this.repoService = repoService;
        this.historyService = historyService;
        this.retrievalService = retrievalService;
        this.promptBuilder = promptBuilder;
        this.chatClient = chatClient;
        this.chatExecutor = chatExecutor;
    }

    public SseEmitter stream(UUID userId, UUID repoId, UUID sessionId, String rawQuestion) {
        String question = validateQuestion(rawQuestion);

        Repository repo = repoService.requiredOwned(repoId, userId);
        if (repo.getIndexStatus() != IndexStatus.READY) {
            throw new ConflictException("Repository " + repo.getFullName() + " is not indexed yet");
        }

        TurnStart turnStart = historyService.startTurn(userId, repoId, sessionId, question);

        SseEmitter emitter = new SseEmitter(RagSettings.STREAM_TIMEOUT_MS);
        ChatTurn turn = new ChatTurn(emitter, repo, turnStart, question);

        emitter.onTimeout(() -> turn.abort("timeout"));
        emitter.onError(e -> turn.abort("connection error"));
        emitter.onCompletion(() -> turn.abort("connection closed"));

        chatExecutor.execute(turn::start);
        return emitter;
    }

    private static String validateQuestion(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Question must not be empty");
        }
        String question = raw.strip();
        if (question.length() > MAX_QUESTION_LENGTH) {
            throw new BadRequestException("Question is too long (max " + MAX_QUESTION_LENGTH + " characters)");
        }
        return question;
    }

    static String retrievalQuery(List<ChatMessage> history, String question) {
        for (int i = history.size() - 1; i >= 0; i--) {
            ChatMessage msg = history.get(i);
            if (msg.getRole() == ChatRole.USER) {
                return msg.getContent() + "\n" + question;
            }
        }
        return question;
    }

    private final class ChatTurn {
        private final SseEmitter emitter;
        private final Repository repo;
        private final TurnStart turnStart;
        private final String question;
        private final StringBuilder answer = new StringBuilder();
        private final long startedAt = System.currentTimeMillis();

        private List<SourceRef> sources = List.of();
        private Disposable subscription;
        private boolean finished;

        ChatTurn(SseEmitter emitter, Repository repo, TurnStart turnStart, String question) {
            this.emitter = emitter;
            this.repo = repo;
            this.turnStart = turnStart;
            this.question = question;
        }

        private UUID sessionId() {
            return turnStart.session().getId();
        }

        void start() {
            try {
                List<RetrievedChunk> chunks = retrievalService.retrieve(
                        repo.getId(), retrievalQuery(turnStart.history(), question));
                BuiltPrompt prompt = promptBuilder.build(repo, chunks, turnStart.history(), question);

                synchronized (this) {
                    if (finished) {
                        return;
                    }
                    sources = prompt.contextChunks().stream().map(RetrievedChunk::toSourceRef).toList();
                    if (!send(ChatEvents.META, new ChatEvents.Meta(
                            sessionId(), turnStart.session().getTitle(), turnStart.userMessage().getId(), sources))) {
                        abort("client disconnected before streaming");
                        return;
                    }
                }

                log.info("Chat turn session={} repo={} chunks={} contextTokens={} historyTokens={}",
                        sessionId(), repo.getFullName(), prompt.contextChunks().size(),
                        prompt.contextTokens(), prompt.historyTokens());

                Disposable d = chatClient.prompt(prompt.toPrompt())
                        .stream()
                        .content()
                        .subscribe(this::onToken, this::onError, this::onComplete);
                setSubscription(d);
            } catch (Exception e) {
                onError(e);
            }
        }

        private synchronized void setSubscription(Disposable d) {
            if (finished) {
                d.dispose();
            } else {
                subscription = d;
            }
        }

        private synchronized void onToken(String token) {
            if (finished || token == null || token.isEmpty()) {
                return;
            }
            answer.append(token);
            if (!send(ChatEvents.TOKEN, new ChatEvents.Token(token))) {
                abort("client disconnected");
            }
        }

        private synchronized void onComplete() {
            if (finished) {
                return;
            }
            finished = true;
            try {
                ChatMessage saved = historyService.saveAssistantMessage(sessionId(), answer.toString(), sources);
                send(ChatEvents.DONE, new ChatEvents.Done(saved.getId()));
                log.info("Chat turn session={} done in {} ms ({} chars)",
                        sessionId(), System.currentTimeMillis() - startedAt, answer.length());
            } catch (Exception e) {
                log.error("Failed to save assistant message for session {}", sessionId(), e);
                send(ChatEvents.ERROR, new ChatEvents.Error("Answer generated but could not be saved"));
            } finally {
                emitter.complete();
            }
        }

        private synchronized void onError(Throwable error) {
            if (finished) {
                return;
            }
            finished = true;
            log.error("Chat turn failed for session {} (repo {})", sessionId(), repo.getFullName(), error);
            savePartialAnswer();
            send(ChatEvents.ERROR, new ChatEvents.Error(describe(error)));
            emitter.complete();
        }

        synchronized void abort(String reason) {
            if (finished) {
                return;
            }
            finished = true;
            if (subscription != null) {
                subscription.dispose();
            }
            log.info("Chat turn session={} aborted: {} ({} chars streamed)", sessionId(), reason, answer.length());
            savePartialAnswer();
            try {
                emitter.complete();
            } catch (Exception ignored) {
            }
        }

        private void savePartialAnswer() {
            if (answer.isEmpty()) {
                return;
            }
            try {
                historyService.saveAssistantMessage(sessionId(), answer + INTERRUPTED_SUFFIX, sources);
            } catch (Exception e) {
                log.warn("Could not save partial answer for session {}: {}", sessionId(), e.getMessage());
            }
        }

        private boolean send(String event, Object payload) {
            try {
                emitter.send(SseEmitter.event().name(event).data(payload, MediaType.APPLICATION_JSON));
                return true;
            } catch (IOException | IllegalStateException e) {
                return false;
            }
        }
    }

    private static String describe(Throwable error) {
        String message = error.getMessage() != null ? error.getMessage() : error.getClass().getSimpleName();
        message = "The AI provider request failed: " + message;
        return message.length() <= MAX_ERROR_MESSAGE_LENGTH
                ? message
                : message.substring(0, MAX_ERROR_MESSAGE_LENGTH) + "…";
    }
}
