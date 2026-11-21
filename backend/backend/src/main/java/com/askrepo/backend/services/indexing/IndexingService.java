package com.askrepo.backend.services.indexing;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.askrepo.backend.entity.IndexStatus;
import com.askrepo.backend.entity.Repository;
import com.askrepo.backend.exceptions.ConflictException;
import com.askrepo.backend.exceptions.NotFoundException;
import com.askrepo.backend.repository.RepoRepository;
import com.askrepo.backend.services.UserServices;
import com.askrepo.backend.services.ai.RagSettings;
import com.askrepo.backend.services.github.GithubApiClient;
import com.askrepo.backend.services.github.GithubRateLimiter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndexingService {
    private static final int VECTOR_BATCH_SIZE = 32;
    private static final int PROGRESS_EVERY_N_FILES = 5;
    private static final int MAX_ERROR_LENGTH = 2000;

    private final RepoRepository repoRepository;
    private final UserServices userService;
    private final GithubApiClient githubApiClient;
    private final CodeFileFilter codeFileFilter;
    private final CodeChunker codeChunker;
    private final GithubRateLimiter rateLimiter;
    private final VectorStore vectorStore;

    @Value("${app.indexing.max-file-bytes:102400}")
    private long maxFileBytes;

    public Repository startIndexing(UUID repoId, UUID userId) {
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new NotFoundException("Repository not found or does not belong to user"));

        int updated = repoRepository.markIndexingIfNotRunning(repoId, userId, Instant.now());
        if (updated == 0) {
            throw new ConflictException("Repository " + repo.getFullName() + " is already being indexed");
        }

        return repoRepository.findById(repoId)
                .orElseThrow(() -> new NotFoundException("Repository not found"));
    }

    @Async("indexingExecutor")
    public void indexAsync(UUID repoId, UUID userId) {
        try {
            doIndex(repoId, userId);
        } catch (Exception ex) {
            log.error("Indexing failed for repoId: {}, userId: {}", repoId, userId, ex);
            markFailed(repoId, ex.getMessage());
        }
    }

    private void doIndex(UUID repoId, UUID userId) {
        Repository repo = repoRepository.findById(repoId)
                .orElseThrow(() -> new NotFoundException("Repository not found"));
        String token = userService.decryptAccessToken(userService.requiredById(userId));
        String repoIdStr = repoId.toString();
        String branch = repo.getDefaulBranch();

        deleteExistingVectors(repoIdStr);

        Map<String, Object> tree = githubApiClient.getRepoTree(token, repo.getOwner(), repo.getName(), branch);
        List<String> filePaths = listIndexableFiles(tree);
        int totalFiles = filePaths.size();

        updateProgress(repoId, totalFiles, 0, 0);

        List<Document> batch = new ArrayList<>();
        int processed = 0;
        int totalChunks = 0;

        for (String path : filePaths) {
            try {
                String content = githubApiClient.getFileContent(
                        token, repo.getOwner(), repo.getName(), path, branch);
                List<Document> chunks = codeChunker.chunkFile(repoIdStr, path, content);
                batch.addAll(chunks);
                totalChunks += chunks.size();
            } catch (Exception e) {
                log.warn("Skipping file {} in {}: {}", path, repo.getFullName(), e.getMessage());
            }

            if (batch.size() >= VECTOR_BATCH_SIZE) {
                vectorStore.add(batch);
                batch.clear();
            }

            processed++;

            if (processed % PROGRESS_EVERY_N_FILES == 0 || processed == totalFiles) {
                updateProgress(repoId, totalFiles, processed, totalChunks);
            }
            rateLimiter.pause();
        }

        if (!batch.isEmpty()) {
            vectorStore.add(batch);
        }
        markReady(repoId, totalFiles, processed, totalChunks);
        log.info("Indexed {}: {} files, {} chunks", repo.getFullName(), processed, totalChunks);
    }

    @SuppressWarnings("unchecked")
    private List<String> listIndexableFiles(Map<String, Object> tree) {
        if (tree == null || tree.get("tree") == null) {
            return List.of();
        }
        if (Boolean.TRUE.equals(tree.get("truncated"))) {
            log.warn("GitHub returned a truncated tree; some files will not be indexed");
        }
        List<Map<String, Object>> entries = (List<Map<String, Object>>) tree.get("tree");
        return entries.stream()
                .filter(entry -> "blob".equals(String.valueOf(entry.get("type"))))
                .filter(entry -> {
                    String path = String.valueOf(entry.get("path"));
                    long size = entry.get("size") instanceof Number n ? n.longValue() : 0L;
                    return codeFileFilter.isAllowed(path, size, maxFileBytes);
                })
                .map(entry -> String.valueOf(entry.get("path")))
                .toList();
    }

    private void deleteExistingVectors(String repoId) {
        try {
            var filter = new FilterExpressionBuilder().eq(RagSettings.METADATA_REPO_ID, repoId).build();
            vectorStore.delete(filter);
        } catch (Exception e) {
            log.warn("Could not delete existing vectors for repo {}: {}", repoId, e.getMessage());
        }
    }

    private void updateProgress(UUID repoId, int total, int processed, int chunks) {
        repoRepository.findById(repoId).ifPresent(repo -> {
            repo.setFilesTotal(total);
            repo.setFilesProcessed(processed);
            repo.setChunkCount(chunks);
            repo.setIndexStatus(IndexStatus.INDEXING);
            repo.setErrorMessage(null);
            repo.setUpdatedAt(Instant.now());
            repoRepository.save(repo);
        });
    }

    private void markReady(UUID repoId, int totalFiles, int processedFiles, int totalChunks) {
        repoRepository.findById(repoId).ifPresent(repo -> {
            Instant now = Instant.now();
            repo.setIndexStatus(IndexStatus.READY);
            repo.setFilesTotal(totalFiles);
            repo.setFilesProcessed(processedFiles);
            repo.setChunkCount(totalChunks);
            repo.setIndexedAt(now);
            repo.setErrorMessage(null);
            repo.setUpdatedAt(now);
            repoRepository.save(repo);
        });
    }

    private void markFailed(UUID repoId, String message) {
        repoRepository.findById(repoId).ifPresent(repo -> {
            repo.setIndexStatus(IndexStatus.FAILED);
            repo.setErrorMessage(message != null && message.length() > MAX_ERROR_LENGTH
                    ? message.substring(0, MAX_ERROR_LENGTH)
                    : message);
            repo.setUpdatedAt(Instant.now());
            repoRepository.save(repo);
        });
    }
}
