import { z } from "zod";
import type { AssessmentResult } from "@/types/assessment";

const termIdSchema = z.enum([
  "liability_cap",
  "indemnification",
  "data_ownership",
  "ip_assignment",
  "exclusivity",
  "unlimited_liability_carveouts",
  "warranty_disclaimers",
  "non_compete_non_solicit",
]);

const verdictSchema = z.enum([
  "Standard",
  "Aggressive",
  "Favorable",
  "Not Found",
  "Verification Failed",
]);

export const termAssessmentSchema = z
  .object({
    termId: termIdSchema,
    verdict: verdictSchema,
    quotedClause: z.string(),
    rationale: z.string(),
    sectionRef: z.string().nullable(),
  })
  .refine(
    (term) =>
      term.verdict === "Not Found" ||
      term.verdict === "Verification Failed" ||
      term.quotedClause.length > 0,
    {
      message:
        'quotedClause must be non-empty unless verdict is "Not Found" or "Verification Failed"',
      path: ["quotedClause"],
    },
  );

const summarySchema = z.object({
  aggressive: z.number().int().nonnegative(),
  standard: z.number().int().nonnegative(),
  favorable: z.number().int().nonnegative(),
  notFound: z.number().int().nonnegative(),
  verificationFailed: z.number().int().nonnegative(),
});

export const assessmentResultSchema = z
  .object({
    filename: z.string(),
    summary: summarySchema,
    terms: z.array(termAssessmentSchema).length(8),
    truncated: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.terms.forEach((term, i) => {
      if (seen.has(term.termId)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate termId: ${term.termId}`,
          path: ["terms", i, "termId"],
        });
      }
      seen.add(term.termId);
    });
  });

export const llmOutputSchema = z
  .object({
    terms: z.array(termAssessmentSchema).length(8),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.terms.forEach((term, i) => {
      if (seen.has(term.termId)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate termId: ${term.termId}`,
          path: ["terms", i, "termId"],
        });
      }
      seen.add(term.termId);
    });
  });

type Inferred = z.infer<typeof assessmentResultSchema>;
type AssertExtends<A, B> = A extends B ? true : false;
const _typeAlignment: [
  AssertExtends<AssessmentResult, Inferred>,
  AssertExtends<Inferred, AssessmentResult>,
] = [true, true];
void _typeAlignment;
