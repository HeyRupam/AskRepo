package com.askrepo.backend.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.askrepo.backend.entity.Repository;

public interface RepoRepository extends JpaRepository<Repository, UUID> {
    List<Repository> findByUserIdOrderByFullNameAsc(UUID userId);
    Optional<Repository> findByIdAndUserId(UUID id, UUID userId);
    Optional<Repository> findByUserIdAndGithubRepoId(UUID userId, Long githubRepoId);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE Repository r
               SET r.indexStatus = com.askrepo.backend.entity.IndexStatus.INDEXING,
                   r.filesProcessed = 0,
                   r.filesTotal = 0,
                   r.chunkCount = 0,
                   r.errorMessage = NULL,
                   r.updatedAt = :now
             WHERE r.id = :id
               AND r.userId = :userId
               AND r.indexStatus <> com.askrepo.backend.entity.IndexStatus.INDEXING
            """)
    int markIndexingIfNotRunning(@Param("id") UUID id, @Param("userId") UUID userId, @Param("now") Instant now);
}
