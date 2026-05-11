import type { AssessmentResult, RubricTerm } from "@/types/assessment";

export type ProviderAssessmentResult = Omit<AssessmentResult, "filename">;

export interface LLMProvider {
  assess(
    contractText: string,
    rubric: readonly RubricTerm[],
  ): Promise<ProviderAssessmentResult>;
}

export class LLMProviderError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "LLMProviderError";
    this.cause = cause;
  }
}
