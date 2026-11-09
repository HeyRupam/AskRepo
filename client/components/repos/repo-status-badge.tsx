import { CircleAlert, CircleCheck, Clock, Loader2 } from "lucide-react";

import type { IndexStatus } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS: Record<
  IndexStatus,
  { label: string; icon: typeof Clock; className: string }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  INDEXING: {
    label: "Indexing",
    icon: Loader2,
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  READY: {
    label: "Ready",
    icon: CircleCheck,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  FAILED: {
    label: "Failed",
    icon: CircleAlert,
    className: "bg-destructive/10 text-destructive",
  },
};

export function RepoStatusBadge({ status }: { status: IndexStatus }) {
  const cfg = STATUS[status] ?? STATUS.PENDING;
  const Icon = cfg.icon;
  return (
    <Badge variant="secondary" className={cn("gap-1", cfg.className)}>
      <Icon className={cn(status === "INDEXING" && "animate-spin")} />
      {cfg.label}
    </Badge>
  );
}
