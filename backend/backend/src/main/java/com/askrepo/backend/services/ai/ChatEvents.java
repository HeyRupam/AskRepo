package com.askrepo.backend.services.ai;

import java.util.List;
import java.util.UUID;

import com.askrepo.backend.dto.SourceRef;

public final class ChatEvents {
    public static final String META = "meta";
    public static final String TOKEN = "token";
    public static final String DONE = "done";
    public static final String ERROR = "error";

    public record Meta(UUID sessionId, String sessionTitle, UUID userMessageId, List<SourceRef> sources) {}

    public record Token(String content) {}

    public record Done(UUID messageId) {}

    public record Error(String message) {}

    private ChatEvents() {
    }
}
