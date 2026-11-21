package com.askrepo.backend.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.askrepo.backend.entity.ChatMessage;
import com.askrepo.backend.entity.ChatRole;

public record ChatMessageResponse(
    UUID id,
    UUID sessionId,
    ChatRole role,
    String content,
    List<SourceRef> sources,
    Instant createdAt
) {
    public static ChatMessageResponse from(ChatMessage m) {
        return new ChatMessageResponse(m.getId(), m.getSessionId(), m.getRole(), m.getContent(),
                m.getSources() == null ? List.of() : m.getSources(), m.getCreatedAt());
    }
}
