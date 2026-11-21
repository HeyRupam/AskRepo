"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  api,
  ApiError,
  type IndexStatusResponse,
  type Repository,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/components/ui/toast";

/**
 * Cached repository list (no GitHub sync). Every consumer shares the same
 * query key, so the overview and repositories pages use one cache.
 */
export function useRepos() {
  return useQuery({
    queryKey: queryKeys.repos.list(),
    queryFn: () => api.repos.list(false),
  });
}

/** Sync with GitHub (refresh=true) and write the result into the shared cache. */
export function useSyncRepos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.repos.list(true),
    onMutate: () => ({
      toastId: toast.add({
        title: "Syncing repositories…",
        description: "Fetching your latest repositories from GitHub.",
        type: "loading",
        timeout: 0,
      }),
    }),
    onSuccess: (repos: Repository[], _vars, ctx) => {
      queryClient.setQueryData(queryKeys.repos.list(), repos);
      toast.close(ctx?.toastId);
      toast.add({
        title: "Sync complete",
        description: `${repos.length} ${repos.length === 1 ? "repository" : "repositories"} up to date.`,
        type: "success",
      });
    },
    onError: (error: Error, _vars, ctx) => {
      toast.close(ctx?.toastId);
      toast.add({
        title: "Sync failed",
        description: error.message || "Could not sync repositories.",
        type: "error",
      });
    },
  });
}

const POLL_INTERVAL_MS = 2000;

function patchRepoInList(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<Repository>,
) {
  queryClient.setQueryData<Repository[]>(queryKeys.repos.list(), (old) =>
    old?.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  );
}

export function useIndexRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repo: Repository) => api.repos.index(repo.id),
    onSuccess: (updated: Repository) => {
      queryClient.removeQueries({ queryKey: queryKeys.repos.status(updated.id) });
      patchRepoInList(queryClient, updated.id, updated);
      toast.add({
        title: "Indexing started",
        description: `${updated.fullName} is being indexed in the background.`,
        type: "info",
      });
    },
    onError: (error: Error, repo) => {
      if (error instanceof ApiError && error.status === 409) {
        queryClient.invalidateQueries({ queryKey: queryKeys.repos.list() });
      }
      toast.add({
        title: "Could not start indexing",
        description: error.message || `Failed to index ${repo.fullName}.`,
        type: "error",
      });
    },
  });
}

export function useIndexStatus(repo: Repository) {
  const queryClient = useQueryClient();
  const isIndexing = repo.indexStatus === "INDEXING";

  return useQuery({
    queryKey: queryKeys.repos.status(repo.id),
    enabled: isIndexing,
    refetchInterval: (query) => {
      const status = query.state.data?.indexStatus;
      return !status || status === "INDEXING" ? POLL_INTERVAL_MS : false;
    },
    refetchIntervalInBackground: true,
    queryFn: async (): Promise<IndexStatusResponse> => {
      const status = await api.repos.status(repo.id);
      patchRepoInList(queryClient, repo.id, {
        indexStatus: status.indexStatus,
        filesTotal: status.filesTotal,
        filesProcessed: status.filesProcessed,
        chunkCount: status.chunkCount,
        indexedAt: status.indexedAt,
        errorMessage: status.errorMessage,
      });

      if (status.indexStatus === "READY") {
        toast.add({
          title: "Indexing complete",
          description: `${repo.fullName}: ${status.filesProcessed} files, ${status.chunkCount} chunks.`,
          type: "success",
        });
      } else if (status.indexStatus === "FAILED") {
        toast.add({
          title: "Indexing failed",
          description: status.errorMessage || `Could not index ${repo.fullName}.`,
          type: "error",
        });
      }
      return status;
    },
  });
}
