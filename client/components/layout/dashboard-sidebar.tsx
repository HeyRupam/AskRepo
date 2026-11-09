"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayersIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { DASHBOARD_NAV, isNavActive } from "@/config/dashboard-nav";
import { Badge } from "@/components/ui/badge";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3 text-sm font-medium">
      {DASHBOARD_NAV.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
              active
                ? "bg-accent font-semibold text-accent-foreground shadow-xs"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex h-16 items-center gap-3 border-b border-border/40 px-4 transition-opacity hover:opacity-90"
    >
      <div
        className="flex size-9 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/10"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.646 0.222 41.116), oklch(0.47 0.157 37.304))",
        }}
      >
        <LayersIcon className="size-5 text-primary-foreground" />
      </div>
      <span className="text-lg font-bold tracking-tight">AskRepo</span>
      <Badge
        variant="secondary"
        className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Preview
      </Badge>
    </Link>
  );
}

export function DashboardSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/40 bg-card/30 md:flex">
      <SidebarBrand />
      <SidebarNav />
    </aside>
  );
}
