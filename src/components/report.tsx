import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Disclaimer } from "@/components/disclaimer";
import { VerdictBadge } from "@/components/verdict-badge";
import { rubric } from "@/lib/rubric";
import type {
  AssessmentResult,
  TermAssessment,
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

export function Report({ result }: ReportProps) {
  const { filename, summary, terms, truncated } = result;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
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

      {truncated === true && (
        <div
          role="note"
          className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-100"
        >
          Contract text was truncated to fit the assessment window — verdicts
          cover the first portion of the document only.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rubric.map((rubricTerm) => {
          const term = findTerm(terms, rubricTerm.id);
          if (!term) return null;
          const hideQuote =
            term.verdict === "Not Found" ||
            term.verdict === "Verification Failed";
          return (
            <Card key={rubricTerm.id} data-term-id={rubricTerm.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <VerdictBadge
                      verdict={term.verdict}
                      notFoundInterpretation={rubricTerm.notFoundInterpretation}
                    />
                    <span className="font-medium">{rubricTerm.label}</span>
                  </div>
                  {term.sectionRef && (
                    <span className="text-xs text-muted-foreground">
                      {term.sectionRef}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {!hideQuote && term.quotedClause.length > 0 && (
                  <pre className="rounded-md border bg-muted p-2 font-mono text-xs whitespace-pre-wrap break-words">
                    {term.quotedClause}
                  </pre>
                )}
                <p className="text-sm">{term.rationale}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Disclaimer />
    </div>
  );
}
