package com.askrepo.backend.dto;

public record SourceRef(
    String filePath,
    Integer chunkIndex,
    String language,
    Double score,
    String preview
) {
}
