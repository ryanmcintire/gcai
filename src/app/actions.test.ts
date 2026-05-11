import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ProviderAssessmentResult,
  LLMProvider,
} from "@/lib/llm";
import { getProvider, LLMProviderError } from "@/lib/llm";
import { parseDocx } from "@/lib/parse";
import type { TermAssessment, TermId } from "@/types/assessment";
import { rubric } from "@/lib/rubric";
import { assessContract } from "./actions";

vi.mock("@/lib/llm", async () => {
  const actual = await vi.importActual<typeof import("@/lib/llm")>("@/lib/llm");
  return { ...actual, getProvider: vi.fn() };
});

vi.mock("@/lib/parse", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/parse")>("@/lib/parse");
  return { ...actual, parseDocx: vi.fn() };
});

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

const SOURCE_TEXT = TERM_IDS.map(
  (id) => `Clause about ${id} appears here in the contract.`,
).join("\n\n");

function buildTerm(termId: TermId): TermAssessment {
  return {
    termId,
    verdict: "Standard",
    quotedClause: `Clause about ${termId} appears here in the contract.`,
    rationale: "Matches the standard rubric.",
    sectionRef: "§1.0",
  };
}

function happyProviderResult(): ProviderAssessmentResult {
  return {
    summary: {
      aggressive: 0,
      standard: 8,
      favorable: 0,
      notFound: 0,
      verificationFailed: 0,
    },
    terms: TERM_IDS.map(buildTerm),
    truncated: false,
  };
}

function makeProvider(
  assess: LLMProvider["assess"] | ReturnType<typeof vi.fn>,
): LLMProvider {
  return { assess: assess as LLMProvider["assess"] };
}

function makeDocxFile(name = "test.docx"): File {
  return new File([new Uint8Array([0])], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function makeFormData(file: File): FormData {
  const fd = new FormData();
  fd.append("file", file);
  return fd;
}

beforeEach(() => {
  vi.mocked(getProvider).mockReset();
  vi.mocked(parseDocx).mockReset();
  vi.mocked(parseDocx).mockResolvedValue(SOURCE_TEXT);
});

describe("assessContract", () => {
  it("happy path: returns the populated AssessmentResult", async () => {
    const assess = vi.fn().mockResolvedValue(happyProviderResult());
    vi.mocked(getProvider).mockReturnValue(makeProvider(assess));

    const result = await assessContract(makeFormData(makeDocxFile()));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.filename).toBe("test.docx");
    expect(result.result.terms).toHaveLength(8);
    expect(result.result.terms.map((t) => t.termId)).toEqual(TERM_IDS);
    expect(result.result.summary.standard).toBe(8);
    expect(result.result.summary.verificationFailed).toBe(0);
    expect(assess).toHaveBeenCalledTimes(1);
    expect(assess).toHaveBeenCalledWith(SOURCE_TEXT, rubric);
  });

  it("bubbles truncated flag from the provider", async () => {
    const providerResult = happyProviderResult();
    providerResult.truncated = true;
    const assess = vi.fn().mockResolvedValue(providerResult);
    vi.mocked(getProvider).mockReturnValue(makeProvider(assess));

    const result = await assessContract(makeFormData(makeDocxFile()));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.truncated).toBe(true);
  });

  it("downgrades unverifiable quotes via verifyQuotes (wiring check)", async () => {
    const providerResult = happyProviderResult();
    providerResult.terms[0] = {
      termId: "liability_cap",
      verdict: "Aggressive",
      quotedClause: "This exact text does not appear in the source contract.",
      rationale: "Cap is too low.",
      sectionRef: "§11.2",
    };
    const assess = vi.fn().mockResolvedValue(providerResult);
    vi.mocked(getProvider).mockReturnValue(makeProvider(assess));

    const result = await assessContract(makeFormData(makeDocxFile()));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const liability = result.result.terms.find(
      (t) => t.termId === "liability_cap",
    );
    expect(liability?.verdict).toBe("Verification Failed");
    expect(result.result.summary.verificationFailed).toBe(1);
    expect(result.result.summary.standard).toBe(7);
  });

  it("surfaces LLMProviderError message to the UI", async () => {
    const assess = vi
      .fn()
      .mockRejectedValue(new LLMProviderError("DEEPSEEK_API_KEY is not set"));
    vi.mocked(getProvider).mockReturnValue(makeProvider(assess));

    const result = await assessContract(makeFormData(makeDocxFile()));

    expect(result).toEqual({
      ok: false,
      error: "DEEPSEEK_API_KEY is not set",
    });
  });

  it("returns validation error when assembled result fails the final schema", async () => {
    const malformed = happyProviderResult();
    malformed.terms = malformed.terms.slice(0, 7);
    const assess = vi.fn().mockResolvedValue(malformed);
    vi.mocked(getProvider).mockReturnValue(makeProvider(assess));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await assessContract(makeFormData(makeDocxFile()));

    expect(result).toEqual({
      ok: false,
      error: "Assessment output failed validation. Please try again.",
    });
    consoleSpy.mockRestore();
  });

  it("short-circuits on file validation before calling the provider", async () => {
    const assess = vi.fn();
    vi.mocked(getProvider).mockReturnValue(makeProvider(assess));

    const badFile = new File([new Uint8Array([0])], "notes.pdf", {
      type: "application/pdf",
    });
    const result = await assessContract(makeFormData(badFile));

    expect(result).toEqual({
      ok: false,
      error: "Only .docx files are supported",
    });
    expect(assess).not.toHaveBeenCalled();
    expect(vi.mocked(getProvider)).not.toHaveBeenCalled();
  });

  it("returns the generic error for unexpected exceptions from assess", async () => {
    const assess = vi.fn().mockRejectedValue(new Error("boom"));
    vi.mocked(getProvider).mockReturnValue(makeProvider(assess));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await assessContract(makeFormData(makeDocxFile()));

    expect(result).toEqual({
      ok: false,
      error: "Could not complete the assessment. Please try again.",
    });
    consoleSpy.mockRestore();
  });
});
