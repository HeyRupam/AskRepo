"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Database, GitBranch, History, Loader2, Sparkles } from "lucide-react";

import type { Repository } from "@/lib/api";
import { useIndexRepo, useIndexStatus, useRepos } from "@/hooks/use-repos";
import { useChatMessages, useChatSessions, useChatStream } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RepoStatusBadge } from "@/components/repos/repo-status-badge";
import { SessionList } from "@/components/chat/session-list";
import { ChatComposer } from "@/components/chat/chat-composer";
import { AssistantMessage, TurnNotice, UserMessage } from "@/components/chat/chat-message";

const SUGGESTIONS = [
  "What does this project do?",
  "How is the codebase structured?",
  "Where is the main entry point?",
  "How do I run it locally?",
];

const STICK_THRESHOLD = 80;

function BackLink() {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      nativeButton={false}
      render={<Link href="/dashboard/repositories" />}
      aria-label="Back to repositories"
    >
      <ArrowLeft />
    </Button>
  );
}

function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold">Repository not found</h2>
      <p className="text-sm text-muted-foreground">It may have been removed, or it isn&apos;t yours.</p>
      <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard/repositories" />}>
        Back to repositories
      </Button>
    </div>
  );
}

function NotIndexed({ repo }: { repo: Repository }) {
  useIndexStatus(repo);
  const indexRepo = useIndexRepo();
  const indexing = repo.indexStatus === "INDEXING";
  const percent = repo.filesTotal > 0 ? Math.round((repo.filesProcessed / repo.filesTotal) * 100) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Database className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          {indexing ? "Indexing in progress" : "Index this repository to start chatting"}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {indexing
            ? "The chat opens automatically once indexing finishes."
            : repo.indexStatus === "FAILED"
              ? repo.errorMessage || "The last indexing attempt failed."
              : "AskRepo needs to read and embed the code before it can answer questions about it."}
        </p>
      </div>
      {indexing ? (
        <div className="w-full max-w-xs space-y-1.5">
          <Progress value={percent} aria-label="Indexing progress" />
          <p className="text-xs text-muted-foreground tabular-nums">
            {percent === null ? "Scanning repository…" : `${repo.filesProcessed} / ${repo.filesTotal} files`}
          </p>
        </div>
      ) : (
        <Button onClick={() => indexRepo.mutate(repo)} disabled={indexRepo.isPending}>
          {indexRepo.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {repo.indexStatus === "FAILED" ? "Retry indexing" : "Index repository"}
        </Button>
      )}
    </div>
  );
}

function EmptyChat({ repo, onPick }: { repo: Repository; onPick: (q: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Ask about {repo.name}</h2>
        <p className="text-sm text-muted-foreground">
          Answers are grounded in the indexed code ({repo.filesProcessed} files, {repo.chunkCount} chunks).
        </p>
      </div>
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ repo }: { repo: Repository }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sessions = useChatSessions(repo.id);
  const messages = useChatMessages(activeId);
  const stream = useChatStream({ repoId: repo.id, sessionId: activeId, onSessionCreated: setActiveId });

  const githubBase = repo.htmlUrl ? `${repo.htmlUrl}/blob/${encodeURIComponent(repo.defaulBranch ?? "main")}` : null;

  const selectSession = useCallback(
    (id: string) => {
      setSheetOpen(false);
      if (id === activeId) return;
      stream.reset();
      setActiveId(id);
    },
    [activeId, stream],
  );

  const newChat = useCallback(() => {
    setSheetOpen(false);
    stream.reset();
    setActiveId(null);
  }, [stream]);

  const onDeleted = useCallback(
    (id: string) => {
      if (id === activeId) newChat();
    },
    [activeId, newChat],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
  };

  useEffect(() => {
    stickRef.current = true;
  }, [activeId]);

  const list = messages.data ?? [];
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [list.length, stream.pending?.answer, stream.pending?.sources, stream.error, activeId, messages.isLoading]);

  const send = (q: string) => {
    stickRef.current = true;
    void stream.send(q);
  };

  const showEmpty = !activeId && list.length === 0 && !stream.pending && !stream.error;
  const loadingHistory = !!activeId && messages.isLoading;

  const sessionList = (
    <SessionList
      repoId={repo.id}
      sessions={sessions.data}
      isLoading={sessions.isLoading}
      activeId={activeId}
      onSelect={selectSession}
      onNew={newChat}
      onDeleted={onDeleted}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <aside className="hidden w-64 shrink-0 flex-col rounded-xl border border-border/50 bg-card/40 p-3 md:flex">
        {sessionList}
      </aside>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-72 p-4">
          <SheetHeader className="p-0">
            <SheetTitle>Chats</SheetTitle>
          </SheetHeader>
          {sessionList}
        </SheetContent>
      </Sheet>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/50 bg-card/40">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 md:hidden">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSheetOpen(true)}>
            <History />
            Chats
          </Button>
          <Button variant="ghost" size="sm" onClick={newChat}>
            New chat
          </Button>
        </div>

        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
          {showEmpty ? (
            <EmptyChat repo={repo} onPick={send} />
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
              {loadingHistory ? (
                <div className="space-y-4">
                  <Skeleton className="ml-auto h-10 w-1/2 rounded-xl" />
                  <Skeleton className="h-24 w-4/5 rounded-xl" />
                </div>
              ) : messages.isError ? (
                <p className="text-center text-sm text-destructive">
                  Could not load this chat: {(messages.error as Error).message}
                </p>
              ) : (
                list.map((m) =>
                  m.role === "USER" ? (
                    <UserMessage key={m.id} content={m.content} />
                  ) : (
                    <AssistantMessage key={m.id} content={m.content} sources={m.sources} githubBase={githubBase} />
                  ),
                )
              )}

              {stream.pending && (
                <>
                  <UserMessage content={stream.pending.question} />
                  <AssistantMessage
                    content={stream.pending.answer}
                    sources={stream.pending.sources}
                    githubBase={githubBase}
                    retrieving={stream.pending.sources === null}
                    streaming
                  />
                </>
              )}

              {stream.error && (
                <TurnNotice
                  message={stream.error.message}
                  kind={stream.error.kind}
                  onRetry={() => send(stream.error!.question)}
                />
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border/50 bg-background/40 p-3">
          <div className="mx-auto w-full max-w-3xl">
            <ChatComposer onSend={send} onStop={stream.stop} streaming={stream.isStreaming} />
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Answers are generated from retrieved code snippets and can be wrong. Check the referenced files.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RepoChat({ repoId }: { repoId: string }) {
  const { data: repos, isLoading, isError, error } = useRepos();
  const repo = repos?.find((r) => r.id === repoId);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="flex-1 rounded-xl" />
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-destructive">Failed to load repository: {(error as Error).message}</p>;
  }
  if (!repo) return <NotFound />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackLink />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold">{repo.fullName}</h2>
            <RepoStatusBadge status={repo.indexStatus} />
          </div>
          {repo.defaulBranch && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <GitBranch className="size-3" />
              {repo.defaulBranch}
            </p>
          )}
        </div>
      </div>

      {repo.indexStatus === "READY" ? <ChatPanel key={repo.id} repo={repo} /> : <NotIndexed repo={repo} />}
    </div>
  );
}
