export type Verdict =
  | "Standard"
  | "Aggressive"
  | "Favorable"
  | "Not Found"
  | "Verification Failed";

export type ExpectedPresence = "expected" | "usually_absent" | "optional";

export type NotFoundInterpretation =
  | "red_flag"
  | "neutral"
  | "favorable"
  | "manual_review";

export type TermId =
  | "liability_cap"
  | "indemnification"
  | "data_ownership"
  | "ip_assignment"
  | "exclusivity"
  | "unlimited_liability_carveouts"
  | "warranty_disclaimers"
  | "non_compete_non_solicit";

export interface TermAssessment {
  termId: TermId;
  verdict: Verdict;
  quotedClause: string;
  rationale: string;
  sectionRef: string | null;
}

export interface AssessmentSummary {
  aggressive: number;
  standard: number;
  favorable: number;
  notFound: number;
  verificationFailed: number;
}

export interface AssessmentResult {
  filename: string;
  summary: AssessmentSummary;
  terms: TermAssessment[];
  truncated?: boolean;
}

export interface RubricTerm {
  id: TermId;
  label: string;
  expectedPresence: ExpectedPresence;
  notFoundInterpretation: NotFoundInterpretation;
  verdictCriteria: {
    aggressive: string;
    standard: string;
    favorable: string;
  };
}
