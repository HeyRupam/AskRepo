package com.askrepo.backend.services.ai;

public final class RagSettings {
    // How many code chunks to fetch from the vector database per question.
    public static final int TOP_K_CHUNKS = 8;

    public static final double MIN_SIMILARITY = 0.3;

    public static final int MAX_CONTEXT_TOKENS = 6000;

    public static final int HISTORY_MESSAGES = 8;

    public static final int MAX_HISTORY_TOKENS = 2000;

    // Max time (ms) to keep an SSE stream open while the model is responding.
    public static final long STREAM_TIMEOUT_MS = 180_000L;

    // Metadata keys stored on each embedded document (must match CodeChunker)
    public static final String METADATA_REPO_ID = "repoId";
    public static final String METADATA_FILE_PATH = "filepath";
    public static final String METADATA_LANGUAGE = "language";
    public static final String METADATA_CHUNK_INDEX = "chunkIndex";

    private RagSettings() {
        // Prevent instantiation
    }
}
