package com.askrepo.backend.services.ai;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.tokenizer.JTokkitTokenCountEstimator;
import org.springframework.ai.tokenizer.TokenCountEstimator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import com.askrepo.backend.entity.ChatMessage;
import com.askrepo.backend.entity.ChatRole;
import com.askrepo.backend.entity.Repository;

@Component
public class PromptBuilder {
    private static final String FILE_HEADER_PREFIX = "// File: ";

    private final String systemPromptTemplate;
    private final TokenCountEstimator tokens = new JTokkitTokenCountEstimator();
    private final int maxContextTokens;
    private final int historyMessages;
    private final int maxHistoryTokens;

    public PromptBuilder(
        @Value("classpath:prompts/system.st") Resource systemPrompt,
        @Value("${app.rag.max-context-tokens:" + RagSettings.MAX_CONTEXT_TOKENS + "}") int maxContextTokens,
        @Value("${app.chat.history-messages:" + RagSettings.HISTORY_MESSAGES + "}") int historyMessages,
        @Value("${app.chat.max-history-tokens:" + RagSettings.MAX_HISTORY_TOKENS + "}") int maxHistoryTokens
    ) {
        this.systemPromptTemplate = new PromptTemplate(systemPrompt).getTemplate();
        this.maxContextTokens = Math.max(500, maxContextTokens);
        this.historyMessages = Math.max(0, historyMessages);
        this.maxHistoryTokens = Math.max(0, maxHistoryTokens);
    }

    public BuiltPrompt build(Repository repo, List<RetrievedChunk> chunks, List<ChatMessage> history, String question) {
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(renderSystemPrompt(repo)));

        HistorySelection historySelection = selectHistory(history);
        messages.addAll(historySelection.messages());

        ContextSelection contextSelection = selectContext(chunks);
        messages.add(new UserMessage(renderUserMessage(contextSelection.chunks(), question)));

        return new BuiltPrompt(
                List.copyOf(messages),
                contextSelection.chunks(),
                contextSelection.tokens(),
                historySelection.tokens());
    }

    private String renderSystemPrompt(Repository repo) {
        return new PromptTemplate(systemPromptTemplate).render(Map.of("repoInfo", repoInfo(repo)));
    }

    private static String repoInfo(Repository repo) {
        StringBuilder sb = new StringBuilder();
        sb.append("- Name: ").append(repo.getFullName()).append('\n');
        if (repo.getDefaulBranch() != null) {
            sb.append("- Branch: ").append(repo.getDefaulBranch()).append('\n');
        }
        if (repo.getLanguage() != null) {
            sb.append("- Primary language: ").append(repo.getLanguage()).append('\n');
        }
        if (repo.getDescription() != null && !repo.getDescription().isBlank()) {
            sb.append("- Description: ").append(repo.getDescription().strip()).append('\n');
        }
        return sb.toString().stripTrailing();
    }

    private record HistorySelection(List<Message> messages, int tokens) {}

    private HistorySelection selectHistory(List<ChatMessage> history) {
        if (history == null || history.isEmpty() || historyMessages == 0 || maxHistoryTokens == 0) {
            return new HistorySelection(List.of(), 0);
        }
        Deque<Message> selected = new ArrayDeque<>();
        int used = 0;
        for (int i = history.size() - 1; i >= 0 && selected.size() < historyMessages; i--) {
            ChatMessage msg = history.get(i);
            if (msg.getContent() == null || msg.getContent().isBlank()) {
                continue;
            }
            int cost = tokens.estimate(msg.getContent());
            if (used + cost > maxHistoryTokens) {
                break;
            }
            used += cost;
            selected.addFirst(msg.getRole() == ChatRole.ASSISTANT
                    ? new AssistantMessage(msg.getContent())
                    : new UserMessage(msg.getContent()));
        }
        while (!selected.isEmpty() && selected.peekFirst() instanceof AssistantMessage) {
            selected.pollFirst();
        }
        return new HistorySelection(List.copyOf(selected), used);
    }

    private record ContextSelection(List<RetrievedChunk> chunks, int tokens) {}

    private ContextSelection selectContext(List<RetrievedChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return new ContextSelection(List.of(), 0);
        }
        List<RetrievedChunk> picked = new ArrayList<>();
        int used = 0;
        for (RetrievedChunk chunk : chunks) {
            int cost = tokens.estimate(renderSource(chunk));
            if (used + cost > maxContextTokens) {
                continue;
            }
            picked.add(chunk);
            used += cost;
        }

        Map<String, Integer> fileRank = new HashMap<>();
        for (int i = 0; i < picked.size(); i++) {
            fileRank.putIfAbsent(picked.get(i).filePath(), i);
        }
        List<RetrievedChunk> ordered = picked.stream()
                .sorted(Comparator
                        .comparing((RetrievedChunk c) -> fileRank.get(c.filePath()))
                        .thenComparingInt(RetrievedChunk::chunkIndex))
                .toList();
        return new ContextSelection(ordered, used);
    }

    private String renderUserMessage(List<RetrievedChunk> chunks, String question) {
        StringBuilder sb = new StringBuilder();
        sb.append("<context>\n");
        if (chunks.isEmpty()) {
            sb.append("(No code in this repository matched the question closely enough.)\n");
        } else {
            for (RetrievedChunk chunk : chunks) {
                sb.append(renderSource(chunk));
            }
        }
        sb.append("</context>\n\n");
        sb.append("Question: ").append(question.strip());
        return sb.toString();
    }

    private static String renderSource(RetrievedChunk chunk) {
        return "<source path=\"" + escapeAttr(chunk.filePath()) + "\" chunk=\"" + chunk.chunkIndex()
                + "\" language=\"" + escapeAttr(chunk.language()) + "\">\n"
                + stripFileHeader(chunk.text()).strip() + "\n"
                + "</source>\n";
    }

    private static String stripFileHeader(String text) {
        if (text == null) {
            return "";
        }
        if (text.startsWith(FILE_HEADER_PREFIX)) {
            int newline = text.indexOf('\n');
            return newline >= 0 ? text.substring(newline + 1) : "";
        }
        return text;
    }

    private static String escapeAttr(String value) {
        return value == null ? "" : value.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;");
    }
}
