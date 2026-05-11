import { describe, it, expect } from "vitest";
import { assessmentResultSchema } from "./schema";
import type {
  AssessmentResult,
  TermAssessment,
  TermId,
} from "@/types/assessment";

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

function buildTerm(
  overrides: Partial<TermAssessment> & { termId: TermId },
): TermAssessment {
  return {
    verdict: "Standard",
    quotedClause: `Sample clause for ${overrides.termId}.`,
    rationale: "Matches the standard rubric for this term.",
    sectionRef: "§1.0",
    ...overrides,
  };
}

function buildValidResult(): AssessmentResult {
  const verdicts: TermAssessment["verdict"][] = [
    "Aggressive",
    "Standard",
    "Favorable",
    "Not Found",
    "Standard",
    "Aggressive",
    "Standard",
    "Favorable",
  ];
  return {
    filename: "Acme MSA.docx",
    summary: {
      aggressive: 2,
      standard: 3,
      favorable: 2,
      notFound: 1,
      verificationFailed: 0,
    },
    terms: TERM_IDS.map((id, i) => {
      const verdict = verdicts[i];
      return buildTerm({
        termId: id,
        verdict,
        quotedClause: verdict === "Not Found" ? "" : `Quote for ${id}.`,
      });
    }),
  };
}

describe("assessmentResultSchema", () => {
  it("accepts a valid result with all 4 LLM-producible verdicts represented", () => {
    const parsed = assessmentResultSchema.safeParse(buildValidResult());
    expect(parsed.success).toBe(true);
  });

  it("accepts a post-verifyQuotes result with one Verification Failed term and empty quote", () => {
    const result = buildValidResult();
    result.terms[0] = buildTerm({
      termId: "liability_cap",
      verdict: "Verification Failed",
      quotedClause: "",
      rationale: "Quote could not be verified against the source contract.",
    });
    result.summary = {
      aggressive: 1,
      standard: 3,
      favorable: 2,
      notFound: 1,
      verificationFailed: 1,
    };
    expect(assessmentResultSchema.safeParse(result).success).toBe(true);
  });

  it("rejects a missing term (7 terms)", () => {
    const result = buildValidResult();
    result.terms = result.terms.slice(0, 7);
    const parsed = assessmentResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(JSON.stringify(parsed.error.issues)).toContain("terms");
    }
  });

  it("rejects an extra term (9 terms)", () => {
    const result = buildValidResult();
    result.terms = [...result.terms, buildTerm({ termId: "liability_cap" })];
    expect(assessmentResultSchema.safeParse(result).success).toBe(false);
  });

  it("rejects duplicate termIds (refinement A)", () => {
    const result = buildValidResult();
    result.terms[1] = buildTerm({ termId: "liability_cap" });
    const parsed = assessmentResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(JSON.stringify(parsed.error.issues)).toContain("Duplicate termId");
    }
  });

  it("rejects an unknown termId", () => {
    const result = buildValidResult();
    const terms = [...result.terms];
    terms[0] = {
      ...terms[0],
      termId: "made_up_term" as unknown as TermId,
    };
    result.terms = terms;
    expect(assessmentResultSchema.safeParse(result).success).toBe(false);
  });

  it("rejects an invalid verdict string", () => {
    const result = buildValidResult();
    const terms = [...result.terms];
    terms[0] = {
      ...terms[0],
      verdict: "Bogus" as unknown as TermAssessment["verdict"],
    };
    result.terms = terms;
    expect(assessmentResultSchema.safeParse(result).success).toBe(false);
  });

  it("rejects empty quotedClause when verdict is Standard (refinement B)", () => {
    const result = buildValidResult();
    result.terms[1] = buildTerm({
      termId: "indemnification",
      verdict: "Standard",
      quotedClause: "",
    });
    const parsed = assessmentResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.endsWith("quotedClause"))).toBe(true);
    }
  });

  it("allows empty quotedClause when verdict is Not Found", () => {
    const result = buildValidResult();
    result.terms[4] = buildTerm({
      termId: "exclusivity",
      verdict: "Not Found",
      quotedClause: "",
    });
    expect(assessmentResultSchema.safeParse(result).success).toBe(true);
  });

  it("allows empty quotedClause when verdict is Verification Failed", () => {
    const result = buildValidResult();
    result.terms[0] = buildTerm({
      termId: "liability_cap",
      verdict: "Verification Failed",
      quotedClause: "",
    });
    result.summary = {
      ...result.summary,
      aggressive: 1,
      verificationFailed: 1,
    };
    expect(assessmentResultSchema.safeParse(result).success).toBe(true);
  });

  it("rejects negative summary counts", () => {
    const result = buildValidResult();
    result.summary = { ...result.summary, aggressive: -1 };
    expect(assessmentResultSchema.safeParse(result).success).toBe(false);
  });
});
