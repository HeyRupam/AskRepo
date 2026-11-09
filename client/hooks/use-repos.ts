"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type Repository } from "@/lib/api";
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
