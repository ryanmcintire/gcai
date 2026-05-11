# Status

## Current focus

**M3 — Rubric + types + schema** (complete). Next: **M4 — LLM provider + quote verification**.

M3 shipped: `src/lib/rubric.ts` (8-term rubric, PRD-fixed order, verbatim §8.2 criteria, `as const satisfies readonly RubricTerm[]` to preserve literal IDs); `src/lib/schema.ts` (`assessmentResultSchema` enforcing `terms.length === 8`, 5-state verdict enum, 8-ID termId enum, refinement A unique termIds, refinement B quote-required-unless-NotFound/VerificationFailed, plus compile-time mutual-assignability assertion against `AssessmentResult`); `termAssessmentSchema` exported for M4 retry reuse. Tests: `rubric.test.ts` (6 cases) + `schema.test.ts` (11 cases). Full toolchain green — typecheck, lint, 23 tests across 5 files.

**Pending manual fidelity probes before M4** (per execution plan, deferred from pre-M3): drop a real MSA with auto-numbered sections AND a pricing/SLA table; confirm section markers (`5.2(a)`) survive and tables read coherently. If either fails, escalate to `mammoth.convertToHtml` + custom HTML→text transformer before wiring the LLM.

See [execution-plan.md](execution-plan.md) for the full milestone breakdown and [prd.md](prd.md) for product scope.

## Todos

- [x] **M1 — Project scaffold** (~0.5 h) — `npm run dev` boots a blank app; toolchain green
- [x] **M2 — Upload + DOCX parse** (~1.0 h) — drop DOCX → see extracted text
- [x] **M3 — Rubric + types + schema** (~0.75 h) — pure data module + zod schemas
- [ ] **M4 — LLM provider + quote verification** (~1.25 h) — `DeepSeekProvider` returns validated, quote-verified `AssessmentResult`
- [ ] **M5 — End-to-end pipeline** (~0.5 h) — drop DOCX → see real assessment as raw JSON
- [ ] **M6 — Results page UI** (~1.5 h) — demo-ready report (cards, badges, summary, disclaimer)
- [ ] **M7 — QA pass + polish + JSON download** (~1.0 h) — verdicts qualitatively correct on 3 MSAs

**Stretch (out of scope for v0):** PDF/markdown export, chunked >60k-token retrieval, severity weighting, eval harness.
