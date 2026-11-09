"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LayersIcon, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { setAuthCookie } from "@/hooks/use-auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const initialError = errorParam
    ? errorDescription ||
      (errorParam === "oauth_failed"
        ? "GitHub authentication was cancelled or failed."
        : `Authentication error: ${errorParam}`)
    : null;

  const [state, setState] = useState<{
    status: "loading" | "success" | "error";
    errorMessage: string | null;
  }>({
    status: initialError ? "error" : "loading",
    errorMessage: initialError,
  });

  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (hasExecutedRef.current || initialError) return;
    hasExecutedRef.current = true;

    const processAuth = async () => {
      try {
        const user = await api.me();
        setAuthCookie(true);
        queryClient.setQueryData(queryKeys.auth.me(), user);
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
        setState({ status: "success", errorMessage: null });

        const returnTo = searchParams.get("returnTo") || "/";
        setTimeout(() => {
          router.replace(returnTo);
        }, 600);
      } catch (err: unknown) {
        setAuthCookie(false);
        const message =
          err instanceof Error
            ? err.message || "Failed to retrieve authenticated user session."
            : "Failed to establish session. Please try again.";
        setState({ status: "error", errorMessage: message });
      }
    };

    processAuth();
  }, [router, searchParams, queryClient, initialError]);

  const { status, errorMessage } = state;

  return (
    <div className="login-bg relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-12">
      <div className="orb-a pointer-events-none absolute left-[-15%] top-[-10%] h-[520px] w-[520px] rounded-full" />
      <div className="orb-b pointer-events-none absolute right-[-10%] top-[30%] h-[400px] w-[400px] rounded-full" />
      <div className="orb-c pointer-events-none absolute bottom-[-15%] left-[30%] h-[450px] w-[450px] rounded-full" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="login-card-wrapper relative z-10 w-full max-w-[420px]">
        <Card className="login-card dark gap-0 rounded-2xl py-0">
          <CardHeader className="items-center pt-8 pb-5 text-center">
            {status === "loading" && (
              <>
                <div
                  className="logo-icon mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.646 0.222 41.116), oklch(0.47 0.157 37.304))",
                  }}
                >
                  <LayersIcon className="size-7 text-primary-foreground" />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-sm font-bold tracking-widest text-primary uppercase">
                    AskRepo
                  </p>
                  <CardTitle className="text-2xl font-semibold text-foreground">
                    Authenticating
                  </CardTitle>
                  <CardDescription>
                    Verifying your GitHub credentials and setting up your workspace...
                  </CardDescription>
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="size-7" />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-sm font-bold tracking-widest text-primary uppercase">
                    AskRepo
                  </p>
                  <CardTitle className="text-2xl font-semibold text-foreground">
                    Welcome aboard!
                  </CardTitle>
                  <CardDescription>
                    Session verified. Redirecting you to your dashboard...
                  </CardDescription>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <AlertCircle className="size-7" />
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <p className="text-sm font-bold tracking-widest text-destructive uppercase">
                    Authentication Failed
                  </p>
                  <CardTitle className="text-2xl font-semibold text-foreground">
                    Unable to sign in
                  </CardTitle>
                  <CardDescription className="text-destructive/90">
                    {errorMessage || "An error occurred during authentication."}
                  </CardDescription>
                </div>
              </>
            )}
          </CardHeader>

          <CardContent className="pb-8">
            {status === "loading" && (
              <div className="flex flex-col items-center justify-center py-4 text-muted-foreground gap-3">
                <Spinner className="size-6 text-primary" />
                <span className="text-xs">Finalizing sign in...</span>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center justify-center py-4 text-emerald-400 gap-3">
                <Spinner className="size-5 text-emerald-400" />
                <span className="text-xs">Redirecting...</span>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 dark:border-input/40 dark:bg-input/20 dark:hover:bg-input/40"
                  onClick={() => router.push("/login")}
                >
                  <ArrowLeft className="size-4" />
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="absolute bottom-5 text-center text-xs text-muted-foreground/40">
        © 2026 AskRepo — Crafted for developers
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="login-bg relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-12">
          <Spinner className="size-8 text-primary" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}