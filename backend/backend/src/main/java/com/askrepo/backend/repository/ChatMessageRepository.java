package com.askrepo.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.askrepo.backend.entity.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    List<ChatMessage> findBySessionIdOrderByCreatedAtDesc(UUID sessionId, Limit limit);

    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM ChatMessage m WHERE m.sessionId = :sessionId")
    int deleteBySessionId(@Param("sessionId") UUID sessionId);
}
