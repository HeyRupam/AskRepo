import { GitBranch, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match only the exact path (used for the overview route). */
  exact?: boolean;
};

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Repositories", href: "/dashboard/repositories", icon: GitBranch },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function isNavActive(item: DashboardNavItem, pathname: string) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
