"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import type { ChatSession } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useDeleteSession, useRenameSession } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function SessionItem({
  session,
  repoId,
  active,
  onSelect,
  onDeleted,
}: {
  session: ChatSession;
  repoId: string;
  active: boolean;
  onSelect: () => void;
  onDeleted: () => void;
}) {
  const rename = useRenameSession(repoId);
  const remove = useDeleteSession(repoId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(session.title);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const commitRename = () => {
    setEditing(false);
    const next = title.trim();
    if (next && next !== session.title) {
      rename.mutate({ sessionId: session.id, title: next });
    } else {
      setTitle(session.title);
    }
  };

  if (editing) {
    return (
      <li className="px-1">
        <Input
          value={title}
          autoFocus
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") {
              setTitle(session.title);
              setEditing(false);
            }
          }}
          className="h-8 text-sm"
          aria-label="Session title"
        />
      </li>
    );
  }

  return (
    <li>
      <div
        className={cn(
          "group/session flex items-center gap-1 rounded-lg pr-1 transition-colors",
          active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 flex-col items-start px-2.5 py-2 text-left"
          aria-current={active ? "page" : undefined}
        >
          <span className="w-full truncate text-sm font-medium">{session.title}</span>
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover/session:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                aria-label={`Options for ${session.title}`}
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setEditing(true)} className="text-xs">
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)} className="text-xs">
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{session.title}&rdquo; and all its messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(session.id, {
                  onSuccess: () => {
                    setConfirmOpen(false);
                    onDeleted();
                  },
                })
              }
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export function SessionList({
  repoId,
  sessions,
  isLoading,
  activeId,
  onSelect,
  onNew,
  onDeleted,
}: {
  repoId: string;
  sessions: ChatSession[] | undefined;
  isLoading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Button variant="outline" size="sm" className="w-full justify-start gap-1.5" onClick={onNew}>
        <Plus />
        New chat
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg" />
            ))}
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center text-xs text-muted-foreground">
            <MessageSquare className="size-5" />
            No chats yet
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                repoId={repoId}
                active={s.id === activeId}
                onSelect={() => onSelect(s.id)}
                onDeleted={() => onDeleted(s.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
