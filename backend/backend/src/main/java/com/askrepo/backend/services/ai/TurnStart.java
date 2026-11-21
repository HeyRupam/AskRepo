package com.askrepo.backend.services.ai;

import java.util.List;

import com.askrepo.backend.entity.ChatMessage;
import com.askrepo.backend.entity.ChatSession;

public record TurnStart(ChatSession session, ChatMessage userMessage, List<ChatMessage> history) {
}
