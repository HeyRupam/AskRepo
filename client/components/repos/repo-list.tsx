"use client";

import { Code2, RefreshCw } from "lucide-react";

import { useRepos, useSyncRepos } from "@/hooks/use-repos";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RepoCard } from "@/components/repos/repo-card";

export function SyncReposButton({ size = "sm" }: { size?: "sm" | "default" }) {
  const sync = useSyncRepos();
  return (
    <Button
      size={size}
      variant="outline"
      className="gap-1.5"
      disabled={sync.isPending}
      onClick={() => sync.mutate()}
    >
      <RefreshCw className={sync.isPending ? "size-4 animate-spin" : "size-4"} />
      {sync.isPending ? "Syncing…" : "Sync from GitHub"}
    </Button>
  );
}

export function RepoList({ limit }: { limit?: number }) {
  const { data, isLoading, isError, error, refetch } = useRepos();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: limit ?? 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">
          Failed to load repositories
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {(error as Error)?.message}
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const repos = limit ? (data ?? []).slice(0, limit) : (data ?? []);

  if (repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 py-12 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Code2 className="size-6" />
        </div>
        <h3 className="text-sm font-semibold">No repositories yet</h3>
        <p className="mb-4 mt-1 max-w-sm text-xs text-muted-foreground">
          Sync your GitHub account to import your repositories.
        </p>
        <SyncReposButton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  );
}
