package com.askrepo.backend.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.askrepo.backend.dto.ChatMessageResponse;
import com.askrepo.backend.dto.ChatRequest;
import com.askrepo.backend.dto.ChatSessionResponse;
import com.askrepo.backend.dto.RenameSessionRequest;
import com.askrepo.backend.exceptions.BadRequestException;
import com.askrepo.backend.security.CurrentUser;
import com.askrepo.backend.services.ai.ChatHistoryService;
import com.askrepo.backend.services.ai.ChatService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChatController {
    private final CurrentUser currentUser;
    private final ChatService chatService;
    private final ChatHistoryService historyService;

    @PostMapping(path = "/repos/{repoId}/chat/stream", consumes = MediaType.APPLICATION_JSON_VALUE)
    public SseEmitter stream(@PathVariable UUID repoId, @RequestBody ChatRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required");
        }
        UUID userId = currentUser.require().getId();
        return chatService.stream(userId, repoId, request.sessionId(), request.question());
    }

    @GetMapping("/repos/{repoId}/chat/sessions")
    public List<ChatSessionResponse> listSessions(@PathVariable UUID repoId) {
        UUID userId = currentUser.require().getId();
        return historyService.listSessions(userId, repoId);
    }

    @GetMapping("/chat/sessions/{sessionId}/messages")
    public List<ChatMessageResponse> messages(@PathVariable UUID sessionId) {
        UUID userId = currentUser.require().getId();
        return historyService.getMessages(userId, sessionId);
    }

    @PatchMapping("/chat/sessions/{sessionId}")
    public ChatSessionResponse rename(@PathVariable UUID sessionId, @RequestBody RenameSessionRequest request) {
        UUID userId = currentUser.require().getId();
        return historyService.renameSession(userId, sessionId, request == null ? null : request.title());
    }

    @DeleteMapping("/chat/sessions/{sessionId}")
    public ResponseEntity<Void> delete(@PathVariable UUID sessionId) {
        UUID userId = currentUser.require().getId();
        historyService.deleteSession(userId, sessionId);
        return ResponseEntity.noContent().build();
    }
}
