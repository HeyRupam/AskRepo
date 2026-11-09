"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LayersIcon, AlertCircle } from "lucide-react";

import { getGithubLoginUrl } from "@/lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function LoginContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = (err: string) => {
    switch (err) {
      case "oauth_failed":
        return "GitHub authentication was cancelled or failed. Please try again.";
      case "auth_failed":
        return "Failed to establish a valid session. Please try again.";
      default:
        return "An unexpected error occurred during sign in. Please try again.";
    }
  };

  const handleGithubLogin = async () => {
    try {
      setIsLoading(true);
      const url = await getGithubLoginUrl();
      window.location.href = url;
    } catch {
      setIsLoading(false);
    }
  };

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
              <p className="text-sm font-bold tracking-widest text-primary uppercase">AskRepo</p>
              <CardTitle className="text-2xl font-semibold text-foreground">Welcome back</CardTitle>
              <CardDescription>Sign in to continue to your workspace</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pb-8 space-y-4">
            {errorParam && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{getErrorMessage(errorParam)}</span>
              </div>
            )}

            <Button
              id="login-github-btn"
              variant="outline"
              size="lg"
              className="w-full gap-2 dark:border-input/40 dark:bg-input/20 dark:hover:bg-input/40"
              disabled={isLoading}
              onClick={handleGithubLogin}
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4 animate-spin" />
                  Connecting to GitHub...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  Continue with GitHub
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="absolute bottom-5 text-center text-xs text-muted-foreground/40">
        © 2026 AskRepo — Crafted for developers
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-bg relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-12">
          <Spinner className="size-8 text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
