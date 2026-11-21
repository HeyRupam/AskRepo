package com.askrepo.backend.dto;

import java.util.UUID;

public record ChatRequest(UUID sessionId, String question) {
}
