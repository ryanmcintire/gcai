import OpenAI from "openai";
import type {
  AssessmentSummary,
  RubricTerm,
  TermAssessment,
  Verdict,
} from "@/types/assessment";
import { llmOutputSchema } from "@/lib/schema";
import { buildPrompt } from "./prompt";
import {
  LLMProviderError,
  type LLMProvider,
  type ProviderAssessmentResult,
} from "./types";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface OpenAILike {
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: ChatMessage[];
        response_format: { type: "json_object" };
      }) => Promise<{
        choices: Array<{ message: { content: string | null } }>;
      }>;
    };
  };
}

export interface DeepSeekProviderOptions {
  apiKey: string;
  model?: string;
  baseURL?: string;
  client?: OpenAILike;
}

type AttemptResult =
  | { kind: "ok"; terms: TermAssessment[] }
  | { kind: "fail"; reason: string; raw: string };

const EMPTY_SUMMARY: AssessmentSummary = {
  aggressive: 0,
  standard: 0,
  favorable: 0,
  notFound: 0,
  verificationFailed: 0,
};

function tallySummary(terms: TermAssessment[]): AssessmentSummary {
  const summary: AssessmentSummary = { ...EMPTY_SUMMARY };
  for (const term of terms) {
    const key = verdictToSummaryKey(term.verdict);
    summary[key] += 1;
  }
  return summary;
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

function evaluateAttempt(content: string | null | undefined): AttemptResult {
  if (!content) {
    return { kind: "fail", reason: "response was empty", raw: "" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    return {
      kind: "fail",
      reason: `response was not valid JSON (${(err as Error).message})`,
      raw: content,
    };
  }
  const validated = llmOutputSchema.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("; ");
    return { kind: "fail", reason: issues, raw: content };
  }
  return { kind: "ok", terms: validated.data.terms };
}

export class DeepSeekProvider implements LLMProvider {
  private readonly client: OpenAILike;
  private readonly model: string;

  constructor(options: DeepSeekProviderOptions) {
    const baseURL = options.baseURL ?? "https://api.deepseek.com";
    this.model = options.model ?? "deepseek-chat";
    this.client =
      options.client ?? new OpenAI({ apiKey: options.apiKey, baseURL });
  }

  async assess(
    contractText: string,
    rubric: readonly RubricTerm[],
  ): Promise<ProviderAssessmentResult> {
    const { system, user, truncated } = buildPrompt(contractText, rubric);

    const messages: ChatMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const first = await this.callOnce(messages);
    if (first.kind === "ok") {
      return {
        summary: tallySummary(first.terms),
        terms: first.terms,
        truncated,
      };
    }

    const retryMessages: ChatMessage[] = [
      ...messages,
      { role: "assistant", content: first.raw },
      {
        role: "user",
        content: `Your previous response failed validation: ${first.reason}. Return only valid JSON matching the schema described in the system prompt. Do not include any prose or markdown.`,
      },
    ];

    const second = await this.callOnce(retryMessages);
    if (second.kind === "ok") {
      return {
        summary: tallySummary(second.terms),
        terms: second.terms,
        truncated,
      };
    }

    throw new LLMProviderError(
      "LLM produced invalid output after one retry",
      second.reason,
    );
  }

  private async callOnce(messages: ChatMessage[]): Promise<AttemptResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      response_format: { type: "json_object" },
    });
    const content = response.choices[0]?.message?.content;
    return evaluateAttempt(content);
  }
}
