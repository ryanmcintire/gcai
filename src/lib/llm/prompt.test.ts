import { describe, it, expect } from "vitest";
import { rubric } from "@/lib/rubric";
import { buildPrompt, MAX_CONTRACT_CHARS } from "./prompt";

describe("buildPrompt", () => {
  it("returns truncated=false for short contract text and echoes the text in user message", () => {
    const text = "Section 1. This is a short contract.";
    const { user, truncated } = buildPrompt(text, rubric);
    expect(truncated).toBe(false);
    expect(user).toContain(text);
  });

  it("contains every termId in PRD-fixed order in the system prompt", () => {
    const { system } = buildPrompt("any", rubric);
    let lastIndex = -1;
    for (const term of rubric) {
      const idx = system.indexOf(term.id);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it("includes all three verdict-criteria buckets for each term in the system prompt", () => {
    const { system } = buildPrompt("any", rubric);
    for (const term of rubric) {
      expect(system).toContain(term.verdictCriteria.aggressive);
      expect(system).toContain(term.verdictCriteria.standard);
      expect(system).toContain(term.verdictCriteria.favorable);
    }
  });

  it("instructs the LLM to choose from the 4 producible verdicts and to quote verbatim", () => {
    const { system } = buildPrompt("any", rubric);
    expect(system).toContain("Standard");
    expect(system).toContain("Aggressive");
    expect(system).toContain("Favorable");
    expect(system).toContain("Not Found");
    expect(system.toLowerCase()).toContain("verbatim");
  });

  it("truncates and flags when contract text exceeds MAX_CONTRACT_CHARS", () => {
    const longText = "x".repeat(MAX_CONTRACT_CHARS + 1000);
    const { user, truncated } = buildPrompt(longText, rubric);
    expect(truncated).toBe(true);
    expect(user.length).toBeLessThanOrEqual(MAX_CONTRACT_CHARS);
  });

  it("does not truncate when contract text is exactly at the limit", () => {
    const text = "x".repeat(MAX_CONTRACT_CHARS);
    const { truncated } = buildPrompt(text, rubric);
    expect(truncated).toBe(false);
  });
});
