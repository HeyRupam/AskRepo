"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, RotateCw, Sparkles } from "lucide-react";

import type { SourceRef } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Markdown } from "@/components/chat/markdown";
import { ChatSources } from "@/components/chat/chat-sources";

export function UserMessage({ content }: { content: string }) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble align="end" variant="default">
          <BubbleContent className="whitespace-pre-wrap">{content}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

function AssistantAvatar() {
  return (
    <MessageAvatar className="size-7 min-w-7 self-start bg-primary/10 text-primary">
      <Sparkles className="size-3.5" />
    </MessageAvatar>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Copy answer"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

export function AssistantMessage({
  content,
  sources,
  githubBase,
  streaming = false,
  retrieving = false,
}: {
  content: string;
  sources: SourceRef[] | null;
  githubBase?: string | null;
  streaming?: boolean;
  retrieving?: boolean;
}) {
  return (
    <Message align="start">
      <AssistantAvatar />
      <MessageContent className="gap-1.5">
        {retrieving ? (
          <p className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Searching the codebase…
          </p>
        ) : content ? (
          <div className={streaming ? "chat-streaming" : undefined}>
            <Markdown>{content}</Markdown>
          </div>
        ) : (
          <p className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Thinking…
          </p>
        )}
        {sources && <ChatSources sources={sources} githubBase={githubBase} />}
        {!streaming && !retrieving && content && (
          <div className="-ml-1.5 flex items-center opacity-60 transition-opacity hover:opacity-100">
            <CopyButton text={content} />
          </div>
        )}
      </MessageContent>
    </Message>
  );
}

export function TurnNotice({
  message,
  kind,
  onRetry,
}: {
  message: string;
  kind: "error" | "stopped";
  onRetry: () => void;
}) {
  return (
    <div
      className={
        kind === "error"
          ? "flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
          : "flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
      }
    >
      <p className={kind === "error" ? "flex items-start gap-2 text-destructive" : "text-muted-foreground"}>
        {kind === "error" && <AlertCircle className="mt-0.5 size-4 shrink-0" />}
        <span className="break-words">{message}</span>
      </p>
      <Button size="xs" variant="outline" onClick={onRetry} className="shrink-0">
        <RotateCw />
        Retry
      </Button>
    </div>
  );
}
