package com.askrepo.backend.dto;

import java.time.Instant;
import java.util.UUID;

import com.askrepo.backend.entity.ChatSession;

public record ChatSessionResponse(
    UUID id,
    UUID repositoryId,
    String title,
    Instant createdAt,
    Instant updatedAt
) {
    public static ChatSessionResponse from(ChatSession s) {
        return new ChatSessionResponse(s.getId(), s.getRepositoryId(), s.getTitle(), s.getCreatedAt(), s.getUpdatedAt());
    }
}
