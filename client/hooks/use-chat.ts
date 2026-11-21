"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  api,
  ApiError,
  streamChat,
  type ChatMessage,
  type ChatSession,
  type SourceRef,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/components/ui/toast";

const INTERRUPTED_SUFFIX = "\n\n_(response interrupted)_";

export function useChatSessions(repoId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.sessions(repoId),
    queryFn: () => api.chat.sessions(repoId),
    enabled,
  });
}

export function useChatMessages(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.chat.messages(sessionId ?? "none"),
    queryFn: () => api.chat.messages(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useRenameSession(repoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      api.chat.rename(sessionId, title),
    onSuccess: (updated) => {
      queryClient.setQueryData<ChatSession[]>(queryKeys.chat.sessions(repoId), (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s)),
      );
    },
    onError: (error: Error) =>
      toast.add({ title: "Rename failed", description: error.message, type: "error" }),
  });
}

export function useDeleteSession(repoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.chat.remove(sessionId),
    onSuccess: (_void, sessionId) => {
      queryClient.setQueryData<ChatSession[]>(queryKeys.chat.sessions(repoId), (old) =>
        old?.filter((s) => s.id !== sessionId),
      );
      queryClient.removeQueries({ queryKey: queryKeys.chat.messages(sessionId) });
    },
    onError: (error: Error) =>
      toast.add({ title: "Delete failed", description: error.message, type: "error" }),
  });
}

export type PendingTurn = {
  question: string;
  answer: string;
  sources: SourceRef[] | null;
};

export type TurnError = {
  message: string;
  question: string;
  kind: "error" | "stopped";
};

type Options = {
  repoId: string;
  sessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
};

export function useChatStream({ repoId, sessionId, onSessionCreated }: Options) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [error, setError] = useState<TurnError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const turnRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);

  const appendMessages = useCallback(
    (sid: string, messages: ChatMessage[]) => {
      queryClient.setQueryData<ChatMessage[]>(queryKeys.chat.messages(sid), (old) => [
        ...(old ?? []),
        ...messages,
      ]);
    },
    [queryClient],
  );

  const send = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || abortRef.current) return;

      const controller = new AbortController();
      abortRef.current = controller;
      const turn = ++turnRef.current;
      const isCurrent = () => turnRef.current === turn;
      setError(null);
      setPending({ question, answer: "", sources: null });

      let sid = sessionId;
      let userMessageId: string | null = null;
      let sources: SourceRef[] = [];
      let answer = "";
      let finished = false;
      let streamError: string | null = null;

      const userMessage = (): ChatMessage => ({
        id: userMessageId!,
        sessionId: sid!,
        role: "USER",
        content: question,
        sources: [],
        createdAt: new Date().toISOString(),
      });

      const settlePartial = () => {
        if (sid && userMessageId) {
          const local: ChatMessage[] = [userMessage()];
          if (answer) {
            local.push({
              id: `local-${Date.now()}`,
              sessionId: sid,
              role: "ASSISTANT",
              content: answer + INTERRUPTED_SUFFIX,
              sources,
              createdAt: new Date().toISOString(),
            });
          }
          appendMessages(sid, local);
        }
        const target = sid;
        setTimeout(() => {
          if (target) queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(target) });
          queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions(repoId) });
        }, 1500);
      };

      try {
        await streamChat(
          repoId,
          { sessionId, question },
          {
            onMeta: (meta) => {
              userMessageId = meta.userMessageId;
              sources = meta.sources;
              if (!sid) {
                sid = meta.sessionId;
                queryClient.setQueryData<ChatMessage[]>(queryKeys.chat.messages(sid), []);
                const now = new Date().toISOString();
                queryClient.setQueryData<ChatSession[]>(queryKeys.chat.sessions(repoId), (old) => [
                  { id: sid!, repositoryId: repoId, title: meta.sessionTitle, createdAt: now, updatedAt: now },
                  ...(old ?? []),
                ]);
                if (isCurrent()) onSessionCreated(sid);
              }
              if (isCurrent()) setPending((p) => (p ? { ...p, sources: meta.sources } : p));
            },
            onToken: (token) => {
              answer += token;
              if (isCurrent()) setPending((p) => (p ? { ...p, answer } : p));
            },
            onDone: ({ messageId }) => {
              finished = true;
              appendMessages(sid!, [
                userMessage(),
                {
                  id: messageId,
                  sessionId: sid!,
                  role: "ASSISTANT",
                  content: answer,
                  sources,
                  createdAt: new Date().toISOString(),
                },
              ]);
              if (isCurrent()) setPending(null);
              queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions(repoId) });
            },
            onError: (message) => {
              streamError = message;
            },
          },
          controller.signal,
        );

        if (!finished) {
          settlePartial();
          if (!isCurrent()) return;
          setPending(null);
          setError({
            message: streamError ?? "The connection closed before the answer finished.",
            question,
            kind: "error",
          });
        }
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === "AbortError";
        if (!aborted && e instanceof ApiError) {
          if (!isCurrent()) return;
          setPending(null);
          setError({ message: e.message, question, kind: "error" });
        } else {
          settlePartial();
          if (!isCurrent()) return;
          setPending(null);
          setError(
            aborted
              ? { message: "Stopped.", question, kind: "stopped" }
              : { message: (e as Error)?.message || "Network error", question, kind: "error" },
          );
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [repoId, sessionId, onSessionCreated, appendMessages, queryClient],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    turnRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(null);
    setError(null);
  }, []);

  return { send, stop, reset, pending, error, isStreaming: pending !== null };
}
