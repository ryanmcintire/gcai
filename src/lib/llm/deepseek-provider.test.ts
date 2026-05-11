import { describe, it, expect, vi } from "vitest";
import { rubric } from "@/lib/rubric";
import type { TermAssessment, TermId } from "@/types/assessment";
import { DeepSeekProvider, type OpenAILike } from "./deepseek-provider";
import { LLMProviderError } from "./types";
import { MAX_CONTRACT_CHARS } from "./prompt";

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

function buildTerm(termId: TermId): TermAssessment {
  return {
    termId,
    verdict: "Standard",
    quotedClause: `Quote for ${termId}.`,
    rationale: "Matches the standard rubric.",
    sectionRef: "§1.0",
  };
}

function validPayload(): { terms: TermAssessment[] } {
  return { terms: TERM_IDS.map(buildTerm) };
}

function fakeResponse(content: string | null) {
  return Promise.resolve({ choices: [{ message: { content } }] });
}

function makeFakeClient(
  create: ReturnType<typeof vi.fn>,
): OpenAILike & {
  chat: { completions: { create: ReturnType<typeof vi.fn> } };
} {
  return { chat: { completions: { create } } };
}

describe("DeepSeekProvider", () => {
  it("returns a tallied result on the happy path (one call)", async () => {
    const create = vi.fn().mockReturnValue(fakeResponse(JSON.stringify(validPayload())));
    const provider = new DeepSeekProvider({
      apiKey: "test",
      client: makeFakeClient(create),
    });

    const result = await provider.assess("short contract text", rubric);

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.terms).toHaveLength(8);
    expect(result.truncated).toBe(false);
    expect(result.summary.standard).toBe(8);
    expect(result.summary.verificationFailed).toBe(0);
  });

  it("retries once on malformed JSON and succeeds on the second call", async () => {
    const create = vi
      .fn()
      .mockReturnValueOnce(fakeResponse("{ not valid json"))
      .mockReturnValueOnce(fakeResponse(JSON.stringify(validPayload())));

    const provider = new DeepSeekProvider({
      apiKey: "test",
      client: makeFakeClient(create),
    });

    const result = await provider.assess("contract", rubric);
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.terms).toHaveLength(8);

    const secondMessages = create.mock.calls[1]![0].messages;
    const lastUser = secondMessages[secondMessages.length - 1];
    expect(lastUser.role).toBe("user");
    expect(lastUser.content).toMatch(/previous response failed validation/i);
  });

  it("throws LLMProviderError when both attempts fail validation", async () => {
    const create = vi
      .fn()
      .mockReturnValueOnce(fakeResponse("{ broken"))
      .mockReturnValueOnce(fakeResponse(JSON.stringify({ terms: [] })));

    const provider = new DeepSeekProvider({
      apiKey: "test",
      client: makeFakeClient(create),
    });

    await expect(provider.assess("contract", rubric)).rejects.toBeInstanceOf(
      LLMProviderError,
    );
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("retries when first response has duplicate termIds (llmOutputSchema refinement)", async () => {
    const dup = validPayload();
    dup.terms[1] = buildTerm("liability_cap"); // duplicate
    const create = vi
      .fn()
      .mockReturnValueOnce(fakeResponse(JSON.stringify(dup)))
      .mockReturnValueOnce(fakeResponse(JSON.stringify(validPayload())));

    const provider = new DeepSeekProvider({
      apiKey: "test",
      client: makeFakeClient(create),
    });

    const result = await provider.assess("contract", rubric);
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.terms).toHaveLength(8);
  });

  it("retries when first response has empty content", async () => {
    const create = vi
      .fn()
      .mockReturnValueOnce(fakeResponse(null))
      .mockReturnValueOnce(fakeResponse(JSON.stringify(validPayload())));

    const provider = new DeepSeekProvider({
      apiKey: "test",
      client: makeFakeClient(create),
    });

    const result = await provider.assess("contract", rubric);
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.terms).toHaveLength(8);

    const secondMessages = create.mock.calls[1]![0].messages;
    const lastUser = secondMessages[secondMessages.length - 1];
    expect(lastUser.content.toLowerCase()).toContain("empty");
  });

  it("sets truncated=true and keeps the user message within MAX_CONTRACT_CHARS for long input", async () => {
    const create = vi.fn().mockReturnValue(fakeResponse(JSON.stringify(validPayload())));
    const provider = new DeepSeekProvider({
      apiKey: "test",
      client: makeFakeClient(create),
    });

    const longText = "x".repeat(MAX_CONTRACT_CHARS + 5000);
    const result = await provider.assess(longText, rubric);

    expect(result.truncated).toBe(true);
    const firstCallMessages = create.mock.calls[0]![0].messages;
    const userMsg = firstCallMessages.find(
      (m: { role: string; content: string }) => m.role === "user",
    );
    expect(userMsg).toBeDefined();
    expect(userMsg!.content.length).toBeLessThanOrEqual(MAX_CONTRACT_CHARS);
  });
});
