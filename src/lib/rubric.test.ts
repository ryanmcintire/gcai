import { describe, it, expect } from "vitest";
import { rubric } from "./rubric";
import type { TermId } from "@/types/assessment";

const expectedOrder: readonly TermId[] = [
  "liability_cap",
  "indemnification",
  "data_ownership",
  "ip_assignment",
  "exclusivity",
  "unlimited_liability_carveouts",
  "warranty_disclaimers",
  "non_compete_non_solicit",
];

const knownIds = new Set<TermId>(expectedOrder);

describe("rubric", () => {
  it("has exactly 8 terms", () => {
    expect(rubric).toHaveLength(8);
  });

  it("lists term IDs in the PRD-fixed order", () => {
    expect(rubric.map((t) => t.id)).toEqual(expectedOrder);
  });

  it("has unique term IDs", () => {
    const ids = rubric.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every rubric id is a valid TermId at runtime", () => {
    for (const term of rubric) {
      expect(knownIds.has(term.id)).toBe(true);
    }
  });

  it("populates label, expectedPresence, notFoundInterpretation for every term", () => {
    for (const term of rubric) {
      expect(term.label.length).toBeGreaterThan(0);
      expect(term.expectedPresence).toMatch(
        /^(expected|usually_absent|optional)$/,
      );
      expect(term.notFoundInterpretation).toMatch(
        /^(red_flag|neutral|favorable|manual_review)$/,
      );
    }
  });

  it("populates all three verdict-criteria strings for every term", () => {
    for (const term of rubric) {
      expect(term.verdictCriteria.aggressive.length).toBeGreaterThan(0);
      expect(term.verdictCriteria.standard.length).toBeGreaterThan(0);
      expect(term.verdictCriteria.favorable.length).toBeGreaterThan(0);
    }
  });
});
