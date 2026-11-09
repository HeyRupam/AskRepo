import { cn } from "@/lib/utils";

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Java: "#b07219",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  Ruby: "#701516",
  PHP: "#4f5d95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Dart: "#00b4ab",
};

export function LanguageBadge({
  language,
  className,
}: {
  language: string | null | undefined;
  className?: string;
}) {
  if (!language) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <span
        className="size-2.5 rounded-full border border-border/50"
        style={{ backgroundColor: LANGUAGE_COLORS[language] ?? "#8b949e" }}
        aria-hidden
      />
      {language}
    </span>
  );
}
