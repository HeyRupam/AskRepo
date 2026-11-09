"use client";

import Link from "next/link";
import { GitBranch, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { RequireAuth, useAuth } from "@/components/providers/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { useRepos } from "@/hooks/use-repos";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RepoList, SyncReposButton } from "@/components/repos/repo-list";

function DashboardContent() {
  const { user } = useAuth();
  const { data: repos, isLoading } = useRepos();
  const total = repos?.length ?? 0;
  const pending = repos?.filter((r) => r.indexStatus === "PENDING").length ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      <div className="rounded-2xl border border-border/50 bg-gradient-to-r from-card to-card/50 p-6 shadow-sm sm:p-8">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            Welcome back
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hello, {user.displayName || user.githubUsername}
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your repositories and get them ready for AI-powered code chat.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-xl border-border/50 bg-card/60 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              GitHub Identity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">@{user.githubUsername}</div>
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-500">
              <ShieldCheck className="size-3.5" />
              OAuth session active
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50 bg-card/60 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Repositories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {isLoading ? <Loader2 className="size-5 animate-spin" /> : total}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Imported from GitHub</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50 bg-card/60 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Indexing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{isLoading ? "–" : pending}</div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting indexing</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Recent Repositories</CardTitle>
            <CardDescription>Your latest repositories.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <SyncReposButton />
            <Button
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href="/dashboard/repositories" />}
            >
              <GitBranch className="size-4" />
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <RepoList limit={6} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </RequireAuth>
  );
}
