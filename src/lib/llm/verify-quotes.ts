import type {
  AssessmentSummary,
  TermAssessment,
  Verdict,
} from "@/types/assessment";
import type { ProviderAssessmentResult } from "./types";

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function verdictToSummaryKey(verdict: Verdict): keyof AssessmentSummary {
  switch (verdict) {
    case "Aggressive":
      return "aggressive";
    case "Standard":
      return "standard";
    case "Favorable":
      return "favorable";
    case "Not Found":
      return "notFound";
    case "Verification Failed":
      return "verificationFailed";
  }
}

function tallySummary(terms: TermAssessment[]): AssessmentSummary {
  const summary: AssessmentSummary = {
    aggressive: 0,
    standard: 0,
    favorable: 0,
    notFound: 0,
    verificationFailed: 0,
  };
  for (const term of terms) {
    summary[verdictToSummaryKey(term.verdict)] += 1;
  }
  return summary;
}

export function verifyQuotes(
  result: ProviderAssessmentResult,
  sourceText: string,
): ProviderAssessmentResult {
  const normalizedSource = normalize(sourceText);

  const terms: TermAssessment[] = result.terms.map((term) => {
    if (term.verdict === "Not Found" || term.verdict === "Verification Failed") {
      return term;
    }
    const normalizedQuote = normalize(term.quotedClause);
    if (
      normalizedQuote.length > 0 &&
      normalizedSource.includes(normalizedQuote)
    ) {
      return term;
    }
    return {
      termId: term.termId,
      verdict: "Verification Failed",
      quotedClause: "",
      rationale: "Quoted clause could not be verified against the source contract.",
      sectionRef: null,
    };
  });

  return {
    summary: tallySummary(terms),
    terms,
    truncated: result.truncated,
  };
}
