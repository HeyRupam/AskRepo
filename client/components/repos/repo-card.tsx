"use client";

import Link from "next/link";
import {
  CircleAlert,
  Database,
  ExternalLink,
  GitBranch,
  Loader2,
  Lock,
  MessageSquare,
  RotateCw,
  Sparkles,
} from "lucide-react";

import type { Repository } from "@/lib/api";
import { useIndexRepo, useIndexStatus } from "@/hooks/use-repos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LanguageBadge } from "@/components/repos/language-badge";
import { RepoStatusBadge } from "@/components/repos/repo-status-badge";

function formatRelative(iso: string | null) {
  if (!iso) return null;
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs) return rtf.format(Math.round(diffSec / secs), unit);
  }
  return "just now";
}

function IndexingProgress({ repo }: { repo: Repository }) {
  const { filesProcessed, filesTotal, chunkCount } = repo;
  const scanning = filesTotal === 0;
  const percent = scanning ? null : Math.round((filesProcessed / filesTotal) * 100);

  return (
    <div className="space-y-1.5">
      <Progress value={percent} aria-label={`Indexing ${repo.fullName}`} />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>
          {scanning ? "Scanning repository…" : `${filesProcessed} / ${filesTotal} files`}
        </span>
        {!scanning && (
          <span>
            {chunkCount} chunks · {percent}%
          </span>
        )}
      </div>
    </div>
  );
}

function IndexSummary({ repo }: { repo: Repository }) {
  if (repo.indexStatus === "INDEXING") {
    return <IndexingProgress repo={repo} />;
  }

  if (repo.indexStatus === "FAILED") {
    return (
      <p
        className="flex items-start gap-1.5 text-[11px] text-destructive"
        title={repo.errorMessage ?? undefined}
      >
        <CircleAlert className="mt-px size-3 shrink-0" />
        <span className="line-clamp-2">{repo.errorMessage || "Indexing failed."}</span>
      </p>
    );
  }

  if (repo.indexStatus === "READY") {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
        <Database className="size-3 shrink-0" />
        {repo.filesProcessed} files · {repo.chunkCount} chunks
        {repo.indexedAt && <> · indexed {formatRelative(repo.indexedAt)}</>}
      </p>
    );
  }

  return null;
}

function IndexButton({ repo }: { repo: Repository }) {
  const indexRepo = useIndexRepo();
  const isIndexing = repo.indexStatus === "INDEXING";
  const busy = isIndexing || indexRepo.isPending;

  const label = isIndexing
    ? "Indexing…"
    : repo.indexStatus === "READY"
      ? "Re-index"
      : repo.indexStatus === "FAILED"
        ? "Retry"
        : "Index";

  const Icon = busy ? Loader2 : repo.indexStatus === "PENDING" ? Sparkles : RotateCw;

  return (
    <Button
      size="xs"
      variant={repo.indexStatus === "PENDING" ? "default" : "outline"}
      disabled={busy}
      onClick={() => indexRepo.mutate(repo)}
    >
      <Icon className={busy ? "animate-spin" : undefined} />
      {label}
    </Button>
  );
}

export function RepoCard({ repo }: { repo: Repository }) {
  useIndexStatus(repo);

  return (
    <Card className="rounded-xl border-border/50 bg-card/60 shadow-xs transition-colors hover:border-border">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold">{repo.name}</h3>
              {repo.isPrivate && (
                <Lock
                  className="size-3 shrink-0 text-muted-foreground"
                  aria-label="Private repository"
                />
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{repo.owner}</p>
          </div>
          <RepoStatusBadge status={repo.indexStatus} />
        </div>

        <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">
          {repo.description || "No description provided."}
        </p>

        <IndexSummary repo={repo} />

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex min-w-0 items-center gap-3">
            <LanguageBadge language={repo.language} />
            {repo.defaulBranch && (
              <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <GitBranch className="size-3 shrink-0" />
                <span className="truncate">{repo.defaulBranch}</span>
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {repo.indexStatus === "READY" && (
              <Button
                size="xs"
                nativeButton={false}
                render={<Link href={`/dashboard/repositories/${repo.id}/chat`} />}
              >
                <MessageSquare />
                Chat
              </Button>
            )}
            <IndexButton repo={repo} />
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Open ${repo.fullName} on GitHub`}
            >
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
