"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { User } from "@/lib/api";
import { DASHBOARD_NAV, isNavActive } from "@/config/dashboard-nav";
import { useCurrentUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  DashboardSidebar,
  SidebarBrand,
  SidebarNav,
} from "@/components/layout/dashboard-sidebar";

export interface AppShellProps {
  children: React.ReactNode;
  user?: User | null;
  className?: string;
  containerClassName?: string;
}

export function AppShell({
  children,
  user: userProp,
  className,
  containerClassName,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const user = userProp !== undefined ? userProp : currentUser;
  const title = DASHBOARD_NAV.find((i) => isNavActive(i, pathname))?.label;

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <DashboardSidebar />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border/40 bg-background animate-in slide-in-from-left duration-200">
            <SidebarBrand />
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          user={user}
          title={title}
          leading={
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          }
        />
        <main className={cn("flex-1", className)}>
          <div
            className={cn(
              "mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8",
              containerClassName
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
