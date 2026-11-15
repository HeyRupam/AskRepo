package com.askrepo.backend.services.indexing;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.askrepo.backend.entity.IndexStatus;
import com.askrepo.backend.entity.Repository;
import com.askrepo.backend.exceptions.NotFoundException;
import com.askrepo.backend.repository.RepoRepository;
import com.askrepo.backend.services.UserServices;
import com.askrepo.backend.services.ai.RagSettings;
import com.askrepo.backend.services.github.GithubApiClient;
import com.askrepo.backend.services.github.GithubRateLimiter;

import jakarta.transaction.Transactional;
import kotlin.uuid.Uuid;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service 
@RequiredArgsConstructor 
@Slf4j
public class IndexingService {
    private static final int  VECTOR_BATCH_SIZE = 32;
    private static final int  PROGRESS_EVERY_N_FILES = 5;

    private final RepoRepository repoRepository;
    private final UserServices userService;
    private final GithubApiClient githubApiClient;
    private final CodeFileFilter codeFileFilter;
    private final CodeChunker codeChunker;
    private final GithubRateLimiter rateLimiter;
    private final VectorStore vectorStore;

    @Value("${app.indexing.max-file-bytes:102400}")
    private long maxFileBytes;

    public Repository startIndexing(UUID repoId, UUID userId){
        Repository repo = repoRepository.findByIdAndUserId(repoId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Repository not found or does not belong to user"));

        if(repo.getIndexStatus() == IndexStatus.INDEXING){
            throw new IllegalStateException("Repository is already being indexed");
        }

        repo.setIndexStatus(IndexStatus.INDEXING);
        repo.setFilesProcessed(0);
        repo.setFilesTotal(0);
        repo.setChunkCount(0);
        repo.setErrorMessage(null);
        repo.setUpdatedAt(Instant.now());
        return repoRepository.save(repo);
    }

    @Async("indexingExecutor")
    public void indexAsync(UUID repoId, UUID userId){
        try{
            doIndex(repoId, userId);
        } catch (Exception ex){
            log.error("Indexing failed for repoId: {}, userId: {}", repoId, userId, ex);
            markFailed(repoId, ex.getMessage());
        }
    }

    public void doIndex(UUID repoId, UUID userId){
        // Write Here Rupam
        Repository repo = repoRepository.findById(userId)
                            .orElseThrow(() -> new NotFoundException("Repository Not Found"));
        String token = userService.decryptAccessToken(userService.requiredById(userId));
        deleteExistingVectors(repoId.toString());

        Map<String, Object> tree = githubApiClient.getRepoTree(token, repo.getOwner(), repo.getName(), repo.getDefaulBranch());
        List<String> filePaths = listIndexableFiles(tree);

        updateProgress(repoId, filePaths.size(), 0, 0, IndexStatus.INDEXING, null);

        List<Document> batch = new ArrayList<>();
        int processed = 0;
        int totalChunks = 0;

        for(String path : filePaths){
            try{
                String content = githubApiClient.getFileContent(
                    token, repo.getOwner(), repo.getName(), repo.getDefaulBranch(), path);
                List<Document> chunks = codeChunker.chunkFile(repo.toString(), path, content);
                batch.addAll(chunks);
                totalChunks += chunks.size();
                if(batch.size() >= VECTOR_BATCH_SIZE){
                    vectorStore.add(batch);
                    batch.clear();
                }
            } catch(Exception e){
                log.warn("Skipping file {} in {}: {}", path, repo.getFullName(), e.getMessage());
            }

            processed++;

            if(processed % PROGRESS_EVERY_N_FILES == 0 || processed == filePaths.size()){
                updateProgress(repoId, filePaths.size(), processed, totalChunks, IndexStatus.INDEXING, null);
            }
            rateLimiter.pause();
            if(!batch.isEmpty()){
                vectorStore.add(batch);
            }
            markReady(repoId, filePaths.size(), processed, totalChunks, repo.getFullName());
        }

    }

    @SuppressWarnings("unchecked")
    private List<String> listIndexableFiles(Map<String, Object> tree){
        if (tree == null || tree.get("tree") == null) {
            return List.of();
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

    private void deleteExistingVectors(String repoId){
        try{
            var filter = new FilterExpressionBuilder().eq(RagSettings.METADATA_REPO_ID, repoId).build();
            vectorStore.delete(filter);
        } catch (Exception e){
            log.warn("Could not delete existing vectors for repo {}: {}");
        }
    }

    @Transactional 
    protected void updateProgress(
        UUID repoId,
        int total,
        int processed,
        int chunks,
        IndexStatus status,
        String error
    ){
        repoRepository.findById(repoId).ifPresent(repo -> {
            repo.setFilesTotal(total);
            repo.setFilesProcessed(processed);
            repo.setChunkCount(chunks);
            repo.setIndexStatus(status);
            repo.setErrorMessage(error);
            repo.setUpdatedAt(Instant.now());
            repoRepository.save(repo);
        });
    }

    @Transactional 
    protected void markReady(
        UUID repoId,
        int totalFiles,
        int processedFiles,
        int totalChunks,
        String fullName
    ){
        repoRepository.findById(repoId).ifPresent(repo -> {
            repo.setIndexStatus(IndexStatus.READY);
            repo.setFilesTotal(totalFiles);
            repo.setFilesProcessed(processedFiles);
            repo.setChunkCount(totalChunks);
            repo.setIndexedAt(Instant.now());
            repo.setErrorMessage("null");
            repo.setUpdatedAt(Instant.now());
            repoRepository.save(repo);
        });
    }

    @Transactional 
    protected void markFailed(UUID repoId, String message){
        repoRepository.findById(repoId).ifPresent(repo -> {
            repo.setIndexStatus(IndexStatus.FAILED);
            repo.setErrorMessage(message != null && message.length() > 2000
                ? message.substring(0, 200)
                : message);
            repo.setUpdatedAt(Instant.now());
            repoRepository.save(repo);
        });
    }
}
