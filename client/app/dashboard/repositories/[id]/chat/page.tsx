"use client";

import { useParams } from "next/navigation";

import { RequireAuth } from "@/components/providers/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { RepoChat } from "@/components/chat/repo-chat";

export default function RepoChatPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <RequireAuth>
      <AppShell containerClassName="flex h-[calc(100dvh-4rem)] max-w-7xl flex-col py-4">
        <RepoChat repoId={id} />
      </AppShell>
    </RequireAuth>
  );
}
