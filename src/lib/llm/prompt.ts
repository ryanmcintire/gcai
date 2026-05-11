import type { RubricTerm } from "@/types/assessment";

export const MAX_CONTRACT_CHARS = 240_000;

export interface BuiltPrompt {
  system: string;
  user: string;
  truncated: boolean;
}

function renderRubric(rubric: readonly RubricTerm[]): string {
  return rubric
    .map((term, i) => {
      const n = i + 1;
      return [
        `${n}. termId: ${term.id}`,
        `   label: ${term.label}`,
        `   expectedPresence: ${term.expectedPresence}`,
        `   verdictCriteria:`,
        `     - Aggressive: ${term.verdictCriteria.aggressive}`,
        `     - Standard: ${term.verdictCriteria.standard}`,
        `     - Favorable: ${term.verdictCriteria.favorable}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function buildPrompt(
  contractText: string,
  rubric: readonly RubricTerm[],
): BuiltPrompt {
  const truncated = contractText.length > MAX_CONTRACT_CHARS;
  const truncatedText = truncated
    ? contractText.slice(0, MAX_CONTRACT_CHARS)
    : contractText;

  const orderList = rubric.map((t, i) => `${i + 1}. ${t.id}`).join("\n");

  const system = [
    "You are a contract-triage assistant for in-house B2B SaaS counsel. You read a vendor contract and classify 8 specific terms against a fixed rubric of B2B SaaS norms.",
    "",
    "RUBRIC (8 terms — assess each one):",
    renderRubric(rubric),
    "",
    "FOR EACH OF THE 8 TERMS, you must:",
    "1. Locate the relevant clause(s) in the contract text.",
    "2. Compare against the rubric row above.",
    "3. Choose exactly one verdict from: Standard | Aggressive | Favorable | Not Found.",
    "4. Quote the supporting clause VERBATIM from the contract text. Do not paraphrase, summarize, or correct typos. The exact substring must appear in the source.",
    "5. Write a one-sentence rationale comparing the clause to the rubric.",
    "6. Provide the section reference if discoverable (e.g., 'Section 11.2', '§12.1'); otherwise null.",
    "",
    "If a term is not present in the contract: set verdict to 'Not Found', quotedClause to empty string \"\", and sectionRef to null. Do NOT invent quotes for absent terms.",
    "",
    "OUTPUT FORMAT — return ONLY a JSON object matching exactly this shape (no prose, no markdown fences):",
    "{",
    '  "terms": [',
    '    { "termId": "<one of the 8 termIds>", "verdict": "Standard|Aggressive|Favorable|Not Found", "quotedClause": "<verbatim clause or empty string>", "rationale": "<one sentence>", "sectionRef": "<section ref or null>" },',
    "    ... (8 entries total)",
    "  ]",
    "}",
    "",
    "The terms array MUST contain exactly 8 entries in this order:",
    orderList,
  ].join("\n");

  const user = truncatedText;

  return { system, user, truncated };
}
