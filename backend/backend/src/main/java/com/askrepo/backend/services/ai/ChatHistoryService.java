package com.askrepo.backend.services.ai;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.askrepo.backend.dto.ChatMessageResponse;
import com.askrepo.backend.dto.ChatSessionResponse;
import com.askrepo.backend.dto.SourceRef;
import com.askrepo.backend.entity.ChatMessage;
import com.askrepo.backend.entity.ChatRole;
import com.askrepo.backend.entity.ChatSession;
import com.askrepo.backend.exceptions.BadRequestException;
import com.askrepo.backend.exceptions.NotFoundException;
import com.askrepo.backend.repository.ChatMessageRepository;
import com.askrepo.backend.repository.ChatSessionRepository;
import com.askrepo.backend.services.RepoService;

@Service
public class ChatHistoryService {
    private static final int TITLE_LENGTH = 60;

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final RepoService repoService;
    private final int historyMessages;

    public ChatHistoryService(
        ChatSessionRepository sessionRepository,
        ChatMessageRepository messageRepository,
        RepoService repoService,
        @Value("${app.chat.history-messages:" + RagSettings.HISTORY_MESSAGES + "}") int historyMessages
    ) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.repoService = repoService;
        this.historyMessages = Math.max(0, historyMessages);
    }

    @Transactional
    public TurnStart startTurn(UUID userId, UUID repoId, UUID sessionId, String question) {
        ChatSession session;
        List<ChatMessage> history;

        if (sessionId == null) {
            session = sessionRepository.save(ChatSession.builder()
                    .userId(userId)
                    .repositoryId(repoId)
                    .title(titleFrom(question))
                    .build());
            history = List.of();
        } else {
            session = sessionRepository.findByIdAndUserId(sessionId, userId)
                    .filter(s -> s.getRepositoryId().equals(repoId))
                    .orElseThrow(() -> new NotFoundException("Chat session not found"));
            history = loadRecentHistory(session.getId());
        }

        ChatMessage userMessage = messageRepository.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role(ChatRole.USER)
                .content(question)
                .build());

        touch(session);
        return new TurnStart(session, userMessage, history);
    }

    @Transactional
    public ChatMessage saveAssistantMessage(UUID sessionId, String content, List<SourceRef> sources) {
        ChatMessage saved = messageRepository.save(ChatMessage.builder()
                .sessionId(sessionId)
                .role(ChatRole.ASSISTANT)
                .content(content)
                .sources(sources == null ? List.of() : new ArrayList<>(sources))
                .build());
        sessionRepository.findById(sessionId).ifPresent(this::touch);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<ChatSessionResponse> listSessions(UUID userId, UUID repoId) {
        repoService.requiredOwned(repoId, userId);
        return sessionRepository.findByUserIdAndRepositoryIdOrderByUpdatedAtDesc(userId, repoId).stream()
                .map(ChatSessionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(UUID userId, UUID sessionId) {
        ChatSession session = requireOwnedSession(userId, sessionId);
        return messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId()).stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    @Transactional
    public ChatSessionResponse renameSession(UUID userId, UUID sessionId, String title) {
        if (title == null || title.isBlank()) {
            throw new BadRequestException("Title must not be empty");
        }
        String cleaned = title.strip().replaceAll("\\s+", " ");
        if (cleaned.length() > ChatSession.MAX_TITLE_LENGTH) {
            throw new BadRequestException("Title is too long (max " + ChatSession.MAX_TITLE_LENGTH + " characters)");
        }
        ChatSession session = requireOwnedSession(userId, sessionId);
        session.setTitle(cleaned);
        return ChatSessionResponse.from(sessionRepository.save(session));
    }

    @Transactional
    public void deleteSession(UUID userId, UUID sessionId) {
        ChatSession session = requireOwnedSession(userId, sessionId);
        messageRepository.deleteBySessionId(session.getId());
        sessionRepository.delete(session);
    }

    private ChatSession requireOwnedSession(UUID userId, UUID sessionId) {
        return sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new NotFoundException("Chat session not found"));
    }

    private List<ChatMessage> loadRecentHistory(UUID sessionId) {
        if (historyMessages == 0) {
            return List.of();
        }
        List<ChatMessage> newestFirst = new ArrayList<>(
                messageRepository.findBySessionIdOrderByCreatedAtDesc(sessionId, Limit.of(historyMessages)));
        Collections.reverse(newestFirst);
        return newestFirst;
    }

    private void touch(ChatSession session) {
        session.setUpdatedAt(Instant.now());
        sessionRepository.save(session);
    }

    static String titleFrom(String question) {
        String oneLine = question.strip().replaceAll("\\s+", " ");
        return oneLine.length() <= TITLE_LENGTH ? oneLine : oneLine.substring(0, TITLE_LENGTH - 1).stripTrailing() + "…";
    }
}
