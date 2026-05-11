# Milestone: M3 — Rubric + types + schema

Pure data + zod validation. Zero I/O. All artifacts here are consumed by M4 (LLM provider) and M6 (renderer), so type names and rubric shape are load-bearing for downstream milestones.

**Design note (resolves a cross-milestone ambiguity):** `Verdict` is a 5-state union including `"Verification Failed"`. The same `assessmentResultSchema` validates both (a) raw LLM output (where the LLM only emits the 4 LLM-producible verdicts) and (b) the post-`verifyQuotes` result (where some terms may have been downgraded to `"Verification Failed"` and had their quotes cleared). Carrying one schema avoids divergence between M4's validation and M6's rendering contract.

## Todos

- [x] **Define assessment types** — Create types per PRD §6.2 / §8.1 in `src/types/assessment.ts`:
  - `Verdict = "Standard" | "Aggressive" | "Favorable" | "Not Found" | "Verification Failed"`
  - `ExpectedPresence = "expected" | "usually_absent" | "optional"`
  - `NotFoundInterpretation = "red_flag" | "neutral" | "favorable" | "manual_review"`
  - `TermId` — string-literal union of the 8 stable snake_case IDs (see next todo for the list)
  - `interface TermAssessment { termId: TermId; verdict: Verdict; quotedClause: string; rationale: string; sectionRef: string | null }`
  - `interface AssessmentSummary { aggressive: number; standard: number; favorable: number; notFound: number; verificationFailed: number }`
  - `interface AssessmentResult { filename: string; summary: AssessmentSummary; terms: TermAssessment[]; truncated?: boolean }`
  Use `interface` for object shapes; `type` only for unions. _Done when: file compiles under strict TS, `TermId` is a string-literal union (not `string`), summary covers all 5 verdicts._ Files: `src/types/assessment.ts`

- [ ] **Author 8-term rubric data module** — Export `rubric: readonly RubricTerm[]` with exactly 8 entries in PRD-fixed order: `liability_cap`, `indemnification`, `data_ownership`, `ip_assignment`, `exclusivity`, `unlimited_liability_carveouts`, `warranty_disclaimers`, `non_compete_non_solicit`. Each entry: `{ id: TermId, label: string, expectedPresence, notFoundInterpretation, verdictCriteria: { aggressive: string, standard: string, favorable: string } }`. Verdict-criteria text is the verbatim PRD §8.2 cell content; `expectedPresence` / `notFoundInterpretation` from §8.1. Mark array `as const` so the literal types are preserved for the rubric test. _Done when: array has length 8, IDs match `TermId` union exactly (compile-time), order matches PRD §6.2 list._ Files: `src/lib/rubric.ts`

- [ ] **Author zod schema** — Build `assessmentResultSchema` mirroring `AssessmentResult` in `src/lib/schema.ts`. Enforce:
  - `terms.length === 8`
  - each `termId` belongs to the 8-ID enum (use `z.enum` with the same string literals as `TermId`)
  - `verdict` belongs to the **5-state** enum (accepts both LLM-raw and post-verifyQuotes shapes per the design note above)
  - `summary` has all 5 non-negative integer counts
  - `truncated` is an optional boolean
  - **Refinement A (`termId` uniqueness):** no two terms share a `termId`
  - **Refinement B (quote rule):** `quotedClause` must be non-empty unless `verdict ∈ {"Not Found", "Verification Failed"}` — matches PRD §6.2 (quote required for assessed states) and the CLAUDE.md mandate "never render an unverified quote"
  Export `termAssessmentSchema` separately for reuse in M4 retry logic. _Done when: schema parses a valid 8-term fixture, rejects each of the failure cases enumerated in the schema test todo._ Files: `src/lib/schema.ts`

- [ ] **Test rubric module** — Co-located test verifying: (a) `rubric.length === 8`; (b) `rubric.map(t => t.id)` deep-equals the PRD-fixed order list; (c) each term has all 4 metadata fields populated and all 3 verdict-criteria strings non-empty; (d) IDs are unique; (e) every rubric `id` is a valid `TermId` (compile-time covered by `as const`; test asserts it explicitly at runtime as a guardrail). _Done when: `npm run test -- --run src/lib/rubric.test.ts` passes._ Files: `src/lib/rubric.test.ts`

- [ ] **Test schema validation** — Co-located test covering, against a shared valid-fixture builder:
  - valid full result passes (all 4 LLM-producible verdicts represented)
  - valid post-verifyQuotes result with one `"Verification Failed"` term (empty quote) passes
  - missing term (7 terms) fails
  - extra term (9 terms) fails
  - duplicate `termId` fails (refinement A)
  - unknown `termId` fails
  - invalid `verdict` string fails
  - non-empty `quotedClause` required when `verdict === "Standard"` (refinement B fires)
  - empty `quotedClause` allowed when `verdict === "Not Found"` and when `verdict === "Verification Failed"`
  - negative summary count fails
  _Done when: every case green; failure messages reference the offending field path._ Files: `src/lib/schema.test.ts`

- [ ] **Verify TS-zod alignment** — Inside `schema.ts`, add a non-exported compile-time assertion that `z.infer<typeof assessmentResultSchema>` is mutually assignable with the `AssessmentResult` interface (both directions). No runtime cost. _Done when: `npm run typecheck` passes; deliberately breaking either side (locally) reproduces a tsc error — do not commit the break._ Files: `src/lib/schema.ts`

- [ ] **Run full toolchain** — `npm run typecheck && npm run lint && npm run test` all green; no new `any`. _Done when: all three commands exit 0._
