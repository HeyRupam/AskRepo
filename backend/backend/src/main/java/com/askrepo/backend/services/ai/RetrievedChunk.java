package com.askrepo.backend.services.ai;

import com.askrepo.backend.dto.SourceRef;

public record RetrievedChunk(
    String filePath,
    int chunkIndex,
    String language,
    double score,
    String text
) {
    private static final int PREVIEW_LENGTH = 240;
    private static final String FILE_HEADER_PREFIX = "// File: ";

    public SourceRef toSourceRef() {
        return new SourceRef(filePath, chunkIndex, language, score, preview());
    }

    private String preview() {
        if (text == null) {
            return "";
        }
        String body = text;
        if (body.startsWith(FILE_HEADER_PREFIX)) {
            int newline = body.indexOf('\n');
            body = newline >= 0 ? body.substring(newline + 1) : "";
        }
        body = body.strip();
        return body.length() <= PREVIEW_LENGTH ? body : body.substring(0, PREVIEW_LENGTH) + "…";
    }
}
