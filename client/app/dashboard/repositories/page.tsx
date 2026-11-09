"use client";

import { RequireAuth } from "@/components/providers/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { RepoList, SyncReposButton } from "@/components/repos/repo-list";

export default function RepositoriesPage() {
  return (
    <RequireAuth>
      <AppShell>
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Repositories</h2>
              <p className="text-sm text-muted-foreground">
                Repositories imported from your GitHub account.
              </p>
            </div>
            <SyncReposButton />
          </div>
          <RepoList />
        </div>
      </AppShell>
    </RequireAuth>
  );
}
