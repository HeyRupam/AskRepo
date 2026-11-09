package com.askrepo.backend.dto;

import java.time.Instant;
import java.util.UUID;

import com.askrepo.backend.entity.IndexStatus;

public record IndexStatusResponse(
    UUID repoId,
    IndexStatus indexStatus,
    int filesTotal,
    int filesProcessed,
    int chunkCount,
    Instant indexedAt,
    String errorMessage
) {
}