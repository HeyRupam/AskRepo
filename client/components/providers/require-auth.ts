"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayersIcon } from "lucide-react";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import type { User } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

export interface AuthContextType {
  user: User;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a <RequireAuth> provider");
  }
  return context;
}

export interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function RequireAuth({
  children,
  fallback,
  redirectTo = "/login",
}: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError } = useCurrentUser();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      const nextParam = encodeURIComponent(pathname || "/dashboard");
      const target = redirectTo.includes("?")
        ? `${redirectTo}&next=${nextParam}`
        : `${redirectTo}?next=${nextParam}`;
      router.replace(target);
    }
  }, [isLoading, isError, user, router, pathname, redirectTo]);

  if (isLoading) {
    if (fallback) {
      return React.createElement(React.Fragment, null, fallback);
    }

    return React.createElement(
      "div",
      {
        className:
          "flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground",
      },
      React.createElement(
        "div",
        { className: "flex flex-col items-center gap-4" },
        React.createElement(
          "div",
          {
            className:
              "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg",
            style: {
              background:
                "linear-gradient(135deg, oklch(0.646 0.222 41.116), oklch(0.47 0.157 37.304))",
            },
          },
          React.createElement(LayersIcon, {
            className: "size-7 text-primary-foreground",
          })
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2 text-muted-foreground text-sm" },
          React.createElement(Spinner, {
            className: "size-4 animate-spin text-primary",
          }),
          React.createElement("span", null, "Loading workspace...")
        )
      )
    );
  }

  if (!user) {
    return null;
  }

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        logout: () => logoutMutation.mutate(),
        isLoading: false,
      },
    },
    children
  );
}

export default RequireAuth;
