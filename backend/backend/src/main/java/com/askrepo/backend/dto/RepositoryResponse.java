package com.askrepo.backend.dto;

import java.time.Instant;
import java.util.UUID;

import com.askrepo.backend.entity.IndexStatus;
import com.fasterxml.jackson.annotation.JsonProperty;

public record RepositoryResponse(
    UUID id,
    Long githubRepoId,
    String owner,
    String name,
    String fullName,
    @JsonProperty("isPrivate") boolean isPrivate,
    String defaulBranch,
    String language,
    String htmlUrl,
    String description,
    IndexStatus indexStatus,
    Instant createdAt,
    int chunkCount,
    int filesTotal,
    int filesProcessed,
    String errorMessage
) {

}
