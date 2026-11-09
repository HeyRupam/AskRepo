import { ExternalLink, GitBranch, Lock } from "lucide-react";

import type { Repository } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageBadge } from "@/components/repos/language-badge";
import { RepoStatusBadge } from "@/components/repos/repo-status-badge";

export function RepoCard({ repo }: { repo: Repository }) {
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

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-3">
            <LanguageBadge language={repo.language} />
            {repo.defaulBranch && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <GitBranch className="size-3" />
                {repo.defaulBranch}
              </span>
            )}
          </div>
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
      </CardContent>
    </Card>
  );
}
