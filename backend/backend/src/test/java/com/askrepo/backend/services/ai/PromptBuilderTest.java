package com.askrepo.backend.services.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.core.io.ClassPathResource;

import com.askrepo.backend.entity.ChatMessage;
import com.askrepo.backend.entity.ChatRole;
import com.askrepo.backend.entity.Repository;

class PromptBuilderTest {
    private static PromptBuilder builder(int maxContextTokens, int historyMessages, int maxHistoryTokens) {
        return new PromptBuilder(new ClassPathResource("prompts/system.st"),
                maxContextTokens, historyMessages, maxHistoryTokens);
    }

    private static Repository repo(String description) {
        Repository r = new Repository();
        r.setFullName("octo/demo");
        r.setDefaulBranch("main");
        r.setLanguage("Java");
        r.setDescription(description);
        return r;
    }

    private static RetrievedChunk chunk(String path, int idx, double score, String body) {
        return new RetrievedChunk(path, idx, "java", score, "// File: " + path + "\n" + body);
    }

    private static ChatMessage msg(ChatRole role, String content) {
        return ChatMessage.builder().role(role).content(content).build();
    }

    @Test
    void bracesInRepoDataAndCodeDoNotBreakTemplate() {
        BuiltPrompt p = builder(6000, 8, 2000).build(
                repo("Uses {placeholders} and } stray braces"),
                List.of(chunk("src/A.java", 0, 0.5, "class A { void run() { if (x) { } } }")),
                List.of(),
                "What does {run} do?");

        String system = p.messages().getFirst().getText();
        assertThat(p.messages().getFirst()).isInstanceOf(SystemMessage.class);
        assertThat(system).contains("- Name: octo/demo")
                .contains("Uses {placeholders} and } stray braces")
                .doesNotContain("{repoInfo}");

        String user = p.messages().getLast().getText();
        assertThat(user).contains("<source path=\"src/A.java\" chunk=\"0\" language=\"java\">")
                .contains("class A { void run() { if (x) { } } }")
                .doesNotContain("// File:")
                .endsWith("Question: What does {run} do?");
        assertThat(p.contextChunks()).hasSize(1);
    }

    @Test
    void contextBudgetDropsLowestRankedAndGroupsByFile() {
        String big = "x ".repeat(400);
        List<RetrievedChunk> chunks = List.of(
                chunk("b/B.java", 3, 0.9, big),
                chunk("a/A.java", 0, 0.8, big),
                chunk("b/B.java", 1, 0.7, big),
                chunk("c/C.java", 0, 0.6, big));

        BuiltPrompt p = builder(1300, 8, 2000).build(repo(null), chunks, List.of(), "q");

        assertThat(p.contextChunks()).extracting(c -> c.filePath() + "#" + c.chunkIndex())
                .containsExactly("b/B.java#1", "b/B.java#3", "a/A.java#0");
        assertThat(p.contextTokens()).isLessThanOrEqualTo(1300);
    }

    @Test
    void emptyContextIsStatedExplicitly() {
        BuiltPrompt p = builder(6000, 8, 2000).build(repo(null), List.of(), List.of(), "hi");
        assertThat(p.messages().getLast().getText()).contains("No code in this repository matched");
        assertThat(p.contextChunks()).isEmpty();
    }

    @Test
    void historyKeepsNewestWithinCountAndStartsWithUser() {
        List<ChatMessage> history = IntStream.range(0, 10)
                .mapToObj(i -> msg(i % 2 == 0 ? ChatRole.USER : ChatRole.ASSISTANT, "message " + i))
                .toList();

        BuiltPrompt p = builder(6000, 5, 2000).build(repo(null), List.of(), history, "next");

        List<Message> hist = p.messages().subList(1, p.messages().size() - 1);
        assertThat(hist).extracting(Message::getText)
                .containsExactly("message 6", "message 7", "message 8", "message 9");
        assertThat(hist.getFirst()).isInstanceOf(UserMessage.class);
        assertThat(hist.getLast()).isInstanceOf(AssistantMessage.class);
    }

    @Test
    void historyTokenBudgetStopsAtFirstOversizedMessage() {
        List<ChatMessage> history = List.of(
                msg(ChatRole.USER, "old question"),
                msg(ChatRole.ASSISTANT, "word ".repeat(3000)),
                msg(ChatRole.USER, "recent question"),
                msg(ChatRole.ASSISTANT, "recent answer"));

        BuiltPrompt p = builder(6000, 8, 500).build(repo(null), List.of(), history, "next");

        List<Message> hist = p.messages().subList(1, p.messages().size() - 1);
        assertThat(hist).extracting(Message::getText).containsExactly("recent question", "recent answer");
        assertThat(p.historyTokens()).isLessThanOrEqualTo(500);
    }
}
