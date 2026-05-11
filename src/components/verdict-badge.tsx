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
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/60",
  standard:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700",
  favorable:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/60",
  verification_failed:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-900/60",
  "not_found:red_flag":
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/60",
  "not_found:neutral": "bg-muted text-muted-foreground border-border",
  "not_found:favorable":
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/60",
  "not_found:manual_review":
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900/60",
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
      <span
        aria-hidden="true"
        className="inline-block size-1.5 rounded-full bg-current opacity-70"
      />
      {BADGE_LABELS[key]}
    </Badge>
  );
}
