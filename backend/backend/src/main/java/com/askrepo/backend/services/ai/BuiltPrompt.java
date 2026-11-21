package com.askrepo.backend.services.ai;

import java.util.List;

import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.prompt.Prompt;

public record BuiltPrompt(
    List<Message> messages,
    List<RetrievedChunk> contextChunks,
    int contextTokens,
    int historyTokens
) {
    public Prompt toPrompt() {
        return new Prompt(messages);
    }
}
