import { describe, it, expect } from "vitest";
import type {
  TermAssessment,
  TermId,
  Verdict,
} from "@/types/assessment";
import { verifyQuotes } from "./verify-quotes";
import type { ProviderAssessmentResult } from "./types";

const TERM_IDS: readonly TermId[] = [
  "liability_cap",
  "indemnification",
  "data_ownership",
  "ip_assignment",
  "exclusivity",
  "unlimited_liability_carveouts",
  "warranty_disclaimers",
  "non_compete_non_solicit",
];

function defaultQuote(id: TermId): string {
  return `Quote for ${id}.`;
}

// Source text containing every default-quote, so terms using the default quote
// always verify successfully. Tests that want a quote to fail verification
// pass a custom quote not present here.
function defaultSource(): string {
  return TERM_IDS.map((id) => defaultQuote(id)).join(" ");
}

function buildResult(
  termsByVerdict: Verdict[],
  quotesById: Partial<Record<TermId, string>> = {},
): ProviderAssessmentResult {
  const terms: TermAssessment[] = TERM_IDS.map((id, i) => {
    const verdict = termsByVerdict[i];
    const quote =
      verdict === "Not Found" || verdict === "Verification Failed"
        ? ""
        : quotesById[id] ?? defaultQuote(id);
    return {
      termId: id,
      verdict,
      quotedClause: quote,
      rationale: "Original rationale.",
      sectionRef: "§1.0",
    };
  });

  return {
    summary: {
      aggressive: terms.filter((t) => t.verdict === "Aggressive").length,
      standard: terms.filter((t) => t.verdict === "Standard").length,
      favorable: terms.filter((t) => t.verdict === "Favorable").length,
      notFound: terms.filter((t) => t.verdict === "Not Found").length,
      verificationFailed: terms.filter(
        (t) => t.verdict === "Verification Failed",
      ).length,
    },
    terms,
    truncated: false,
  };
}

describe("verifyQuotes", () => {
  it("keeps a term whose quotedClause exactly matches the source", () => {
    const result = buildResult(
      [
        "Standard",
        "Standard",
        "Standard",
        "Standard",
        "Not Found",
        "Standard",
        "Standard",
        "Not Found",
      ],
      { liability_cap: "Vendor's total liability shall not exceed 12 months." },
    );
    const source =
      "Section 11.2 Liability. Vendor's total liability shall not exceed 12 months. " +
      defaultSource();
    const verified = verifyQuotes(result, source);
    expect(verified.terms[0].verdict).toBe("Standard");
    expect(verified.terms[0].quotedClause).toBe(
      "Vendor's total liability shall not exceed 12 months.",
    );
  });

  it("matches whitespace-tolerantly (extra newlines and spaces in source)", () => {
    const result = buildResult(
      [
        "Aggressive",
        "Standard",
        "Standard",
        "Standard",
        "Not Found",
        "Standard",
        "Standard",
        "Not Found",
      ],
      { liability_cap: "Cap is three months of fees." },
    );
    const source =
      "Section 11.\n\n   Cap is three   months\nof fees.\nMore text. " +
      defaultSource();
    const verified = verifyQuotes(result, source);
    expect(verified.terms[0].verdict).toBe("Aggressive");
    expect(verified.terms[0].quotedClause).toBe("Cap is three months of fees.");
  });

  it("downgrades a term whose quote does not appear in the source", () => {
    const result = buildResult(
      [
        "Aggressive",
        "Standard",
        "Standard",
        "Standard",
        "Not Found",
        "Standard",
        "Standard",
        "Not Found",
      ],
      { liability_cap: "Hallucinated quote not in source." },
    );
    const source = defaultSource();
    const verified = verifyQuotes(result, source);
    expect(verified.terms[0]).toEqual({
      termId: "liability_cap",
      verdict: "Verification Failed",
      quotedClause: "",
      rationale: "Quoted clause could not be verified against the source contract.",
      sectionRef: null,
    });
  });

  it("passes Not Found verdict through unchanged regardless of quotedClause", () => {
    const result = buildResult([
      "Standard",
      "Standard",
      "Standard",
      "Standard",
      "Not Found",
      "Standard",
      "Standard",
      "Not Found",
    ]);
    const verified = verifyQuotes(result, defaultSource());
    expect(verified.terms[4].verdict).toBe("Not Found");
    expect(verified.terms[4].quotedClause).toBe("");
  });

  it("passes already-Verification Failed terms through unchanged", () => {
    const result = buildResult([
      "Verification Failed",
      "Standard",
      "Standard",
      "Standard",
      "Not Found",
      "Standard",
      "Standard",
      "Not Found",
    ]);
    const verified = verifyQuotes(result, defaultSource());
    expect(verified.terms[0].verdict).toBe("Verification Failed");
    expect(verified.terms[0].quotedClause).toBe("");
  });

  it("recomputes summary after downgrading one Standard term to Verification Failed", () => {
    const result = buildResult(
      [
        "Standard",
        "Standard",
        "Standard",
        "Standard",
        "Not Found",
        "Standard",
        "Standard",
        "Not Found",
      ],
      { liability_cap: "Will not appear in source." },
    );
    const source = defaultSource(); // every default-quote term verifies; liability_cap downgrades
    const verified = verifyQuotes(result, source);
    expect(verified.summary.standard).toBe(result.summary.standard - 1);
    expect(verified.summary.verificationFailed).toBe(1);
    expect(verified.summary.notFound).toBe(result.summary.notFound);
  });

  it("does not mutate the input result or its terms", () => {
    const result = buildResult(
      [
        "Standard",
        "Standard",
        "Standard",
        "Standard",
        "Not Found",
        "Standard",
        "Standard",
        "Not Found",
      ],
      { liability_cap: "Not in source." },
    );
    const inputSnapshot = JSON.parse(JSON.stringify(result));
    verifyQuotes(result, defaultSource());
    expect(result).toEqual(inputSnapshot);
  });

  it("preserves the truncated flag from the input", () => {
    const result = {
      ...buildResult([
        "Standard",
        "Standard",
        "Standard",
        "Standard",
        "Not Found",
        "Standard",
        "Standard",
        "Not Found",
      ]),
      truncated: true,
    };
    const verified = verifyQuotes(result, defaultSource());
    expect(verified.truncated).toBe(true);
  });
});
