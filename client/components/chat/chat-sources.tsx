"use client";

import { useMemo } from "react";
import { ChevronRight, FileCode2 } from "lucide-react";

import type { SourceRef } from "@/lib/api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type FileGroup = { filePath: string; best: number; chunks: SourceRef[] };

function groupByFile(sources: SourceRef[]): FileGroup[] {
  const map = new Map<string, FileGroup>();
  for (const s of sources) {
    const g = map.get(s.filePath) ?? { filePath: s.filePath, best: 0, chunks: [] };
    g.chunks.push(s);
    g.best = Math.max(g.best, s.score ?? 0);
    map.set(s.filePath, g);
  }
  return [...map.values()]
    .map((g) => ({ ...g, chunks: g.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex) }))
    .sort((a, b) => b.best - a.best);
}

export function ChatSources({ sources, githubBase }: { sources: SourceRef[]; githubBase?: string | null }) {
  const groups = useMemo(() => groupByFile(sources), [sources]);
  if (groups.length === 0) return null;

  return (
    <Collapsible className="mt-1">
      <CollapsibleTrigger className="group/sources inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground">
        <ChevronRight className="size-3.5 transition-transform group-data-[panel-open]/sources:rotate-90" />
        {groups.length} {groups.length === 1 ? "file" : "files"} referenced
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1.5">
          {groups.map((g) => {
            const href = githubBase
              ? `${githubBase}/${g.filePath.split("/").map(encodeURIComponent).join("/")}`
              : undefined;
            return (
              <li key={g.filePath} className="rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-1.5 text-xs font-medium hover:underline"
                    title={g.filePath}
                  >
                    <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono">{g.filePath}</span>
                  </a>
                  <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                    {g.chunks.length > 1 ? `${g.chunks.length} chunks · ` : ""}
                    {Math.round(g.best * 100)}% match
                  </span>
                </div>
                {g.chunks[0]?.preview && (
                  <p className="mt-1 line-clamp-2 font-mono text-[11px] text-muted-foreground">
                    {g.chunks[0].preview}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
