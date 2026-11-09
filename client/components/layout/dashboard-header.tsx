"use client";

import { ExternalLink, LogOut, ShieldCheck } from "lucide-react";

import type { User } from "@/lib/api";
import { useLogout } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardHeader({
  user,
  title,
  leading,
}: {
  user?: User | null;
  title?: string;
  leading?: React.ReactNode;
}) {
  const logout = useLogout();
  const name = user?.displayName || user?.githubUsername;
  const initials = (name || "U").substring(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/40 bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-2">
        {leading}
        {title && <h1 className="text-sm font-semibold sm:text-base">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <ModeToggle />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-full p-1.5"
                  aria-label="User profile menu"
                />
              }
            >
              <Avatar className="size-8 border border-border/60 shadow-xs">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
                <AvatarFallback className="text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col pr-1 text-left lg:flex">
                <span className="text-xs font-medium leading-none">{name}</span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">
                  @{user.githubUsername}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg">
              <DropdownMenuLabel className="p-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    @{user.githubUsername}
                  </p>
                  <div className="flex items-center gap-1 pt-1 text-[11px] font-normal text-emerald-500">
                    <ShieldCheck className="size-3" />
                    <span>Connected to GitHub</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <a
                    href={`https://github.com/${user.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                className="flex w-full cursor-pointer items-center justify-between"
              >
                <span className="text-xs">GitHub Profile</span>
                <ExternalLink className="size-3.5 text-muted-foreground" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
                className="cursor-pointer text-xs"
              >
                {logout.isPending ? (
                  <>
                    <Spinner className="mr-2 size-3.5 animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 size-3.5" />
                    <span>Sign out</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
