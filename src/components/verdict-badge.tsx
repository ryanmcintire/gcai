import { Badge } from "@/components/ui/badge";
import type { NotFoundInterpretation, Verdict } from "@/types/assessment";

type BadgeKey =
  | "aggressive"
  | "standard"
  | "favorable"
  | "verification_failed"
  | "not_found:red_flag"
  | "not_found:neutral"
  | "not_found:favorable"
  | "not_found:manual_review";

const BADGE_LABELS: Record<BadgeKey, string> = {
  aggressive: "Aggressive",
  standard: "Standard",
  favorable: "Favorable",
  verification_failed: "Verification Failed",
  "not_found:red_flag": "Not Found — Red Flag",
  "not_found:neutral": "Not Found",
  "not_found:favorable": "Not Found — Favorable",
  "not_found:manual_review": "Not Found — Verify",
};

const BADGE_CLASSES: Record<BadgeKey, string> = {
  aggressive:
    "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-100 dark:border-red-800",
  standard:
    "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
  favorable:
    "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-800",
  verification_failed:
    "bg-orange-100 text-orange-900 border-orange-400 dark:bg-orange-950/60 dark:text-orange-100 dark:border-orange-800",
  "not_found:red_flag":
    "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-100 dark:border-red-800",
  "not_found:neutral":
    "bg-muted text-muted-foreground border-border",
  "not_found:favorable":
    "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-800",
  "not_found:manual_review":
    "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-100 dark:border-blue-800",
};

function resolveKey(
  verdict: Verdict,
  notFoundInterpretation: NotFoundInterpretation,
): BadgeKey {
  switch (verdict) {
    case "Aggressive":
      return "aggressive";
    case "Standard":
      return "standard";
    case "Favorable":
      return "favorable";
    case "Verification Failed":
      return "verification_failed";
    case "Not Found":
      return `not_found:${notFoundInterpretation}` as BadgeKey;
  }
}

export interface VerdictBadgeProps {
  verdict: Verdict;
  notFoundInterpretation: NotFoundInterpretation;
}

export function VerdictBadge({
  verdict,
  notFoundInterpretation,
}: VerdictBadgeProps) {
  const key = resolveKey(verdict, notFoundInterpretation);
  return (
    <Badge variant="outline" className={BADGE_CLASSES[key]}>
      {BADGE_LABELS[key]}
    </Badge>
  );
}
