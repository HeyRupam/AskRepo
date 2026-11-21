package com.askrepo.backend.services.ai;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class RetrievalService {
    private final VectorStore vectorStore;
    private final int topK;
    private final double minSimilarity;

    public RetrievalService(
        VectorStore vectorStore,
        @Value("${app.rag.top-k:" + RagSettings.TOP_K_CHUNKS + "}") int topK,
        @Value("${app.rag.min-similarity:" + RagSettings.MIN_SIMILARITY + "}") double minSimilarity
    ) {
        this.vectorStore = vectorStore;
        this.topK = Math.max(1, topK);
        this.minSimilarity = Math.clamp(minSimilarity, 0.0, 1.0);
    }

    public List<RetrievedChunk> retrieve(UUID repoId, String query) {
        if (repoId == null || query == null || query.isBlank()) {
            return List.of();
        }

        SearchRequest request = SearchRequest.builder()
                .query(query.strip())
                .topK(topK)
                .similarityThreshold(minSimilarity)
                .filterExpression(new FilterExpressionBuilder()
                        .eq(RagSettings.METADATA_REPO_ID, repoId.toString())
                        .build())
                .build();

        List<Document> documents = vectorStore.similaritySearch(request);
        if (documents == null || documents.isEmpty()) {
            log.debug("No chunks above {} for repo {}", minSimilarity, repoId);
            return List.of();
        }

        List<RetrievedChunk> chunks = documents.stream()
                .map(RetrievalService::toChunk)
                .toList();

        if (log.isDebugEnabled()) {
            log.debug("Retrieved {} chunks for repo {}: {}", chunks.size(), repoId,
                    chunks.stream().map(c -> "%s#%d(%.3f)".formatted(c.filePath(), c.chunkIndex(), c.score())).toList());
        }
        return chunks;
    }

    private static RetrievedChunk toChunk(Document doc) {
        Map<String, Object> meta = doc.getMetadata();
        return new RetrievedChunk(
                stringOr(meta.get(RagSettings.METADATA_FILE_PATH), "unknown"),
                intOr(meta.get(RagSettings.METADATA_CHUNK_INDEX), 0),
                stringOr(meta.get(RagSettings.METADATA_LANGUAGE), "text"),
                doc.getScore() != null ? doc.getScore() : 0.0,
                doc.getText());
    }

    private static String stringOr(Object value, String fallback) {
        return value != null ? String.valueOf(value) : fallback;
    }

    private static int intOr(Object value, int fallback) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        if (value != null) {
            try {
                return (int) Double.parseDouble(String.valueOf(value));
            } catch (NumberFormatException ignored) {
            }
        }
        return fallback;
    }
}
