import { AlertTriangle, FileText, ShieldAlert } from "lucide-react";

import { Disclaimer } from "@/components/disclaimer";
import { DownloadJsonButton } from "@/components/download-json-button";
import { VerdictBadge } from "@/components/verdict-badge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { rubric } from "@/lib/rubric";
import type {
  AssessmentResult,
  NotFoundInterpretation,
  TermAssessment,
  Verdict,
} from "@/types/assessment";

export interface ReportProps {
  result: AssessmentResult;
}

function findTerm(
  terms: TermAssessment[],
  termId: string,
): TermAssessment | undefined {
  return terms.find((t) => t.termId === termId);
}

function accentClass(
  verdict: Verdict,
  notFoundInterpretation: NotFoundInterpretation,
): string {
  switch (verdict) {
    case "Aggressive":
      return "border-l-red-400 dark:border-l-red-500/70";
    case "Favorable":
      return "border-l-emerald-400 dark:border-l-emerald-500/70";
    case "Standard":
      return "border-l-slate-300 dark:border-l-slate-600";
    case "Verification Failed":
      return "border-l-orange-400 dark:border-l-orange-500/70";
    case "Not Found":
      switch (notFoundInterpretation) {
        case "red_flag":
          return "border-l-red-400 dark:border-l-red-500/70";
        case "favorable":
          return "border-l-emerald-400 dark:border-l-emerald-500/70";
        case "manual_review":
          return "border-l-blue-400 dark:border-l-blue-500/70";
        default:
          return "border-l-border";
      }
  }
}

export function Report({ result }: ReportProps) {
  const { filename, summary, terms, truncated } = result;
  const allVerificationFailed =
    terms.length > 0 && summary.verificationFailed === terms.length;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText aria-hidden="true" className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-base font-semibold break-words">{filename}</p>
            <p className="text-sm text-muted-foreground">
              {summary.aggressive} Aggressive · {summary.standard} Standard ·{" "}
              {summary.favorable} Favorable · {summary.notFound} Not Found
            </p>
            {summary.verificationFailed > 0 && (
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {summary.verificationFailed} could not be verified
              </p>
            )}
          </div>
        </div>
        <DownloadJsonButton result={result} />
      </div>

      {truncated === true && (
        <Alert tone="warning" icon={<AlertTriangle />}>
          Contract text was truncated to fit the assessment window — verdicts
          cover the first portion of the document only.
        </Alert>
      )}

      {allVerificationFailed && (
        <Alert tone="danger" role="alert" icon={<ShieldAlert />}>
          None of the quoted clauses could be verified against the contract
          text. The assessment may not be reliable — try re-uploading the
          contract.
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        {rubric.map((rubricTerm) => {
          const term = findTerm(terms, rubricTerm.id);
          if (!term) return null;
          const hideQuote =
            term.verdict === "Not Found" ||
            term.verdict === "Verification Failed";
          return (
            <Card
              key={rubricTerm.id}
              data-term-id={rubricTerm.id}
              className={cn(
                "border-l-4",
                accentClass(term.verdict, rubricTerm.notFoundInterpretation),
              )}
            >
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <VerdictBadge
                      verdict={term.verdict}
                      notFoundInterpretation={rubricTerm.notFoundInterpretation}
                    />
                    <span className="text-sm font-medium">
                      {rubricTerm.label}
                    </span>
                  </div>
                  {term.sectionRef && (
                    <span className="font-mono text-[0.7rem] tracking-wider text-muted-foreground uppercase">
                      {term.sectionRef}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5">
                {!hideQuote && term.quotedClause.length > 0 && (
                  <blockquote className="border-l-2 border-border pl-3 text-sm whitespace-pre-wrap break-words text-muted-foreground italic">
                    {term.quotedClause}
                  </blockquote>
                )}
                <p className="text-sm leading-relaxed">{term.rationale}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Disclaimer />
    </div>
  );
}
