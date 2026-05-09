# Status

## Current focus

**M2 — Upload + DOCX parse** (not started)

M1 scaffold is complete: Next.js 16 + TS + Tailwind v4 + shadcn/ui + Vitest. Placeholder page renders a shadcn `Card`; `dev`, `typecheck`, `lint`, `test` all green (2 sanity tests passing — node + jsdom). Note: scaffold installed Next.js **16** (latest stable as of 2026-05-08), not 15 as originally drafted; PRD/execution-plan still reference 15 — superseded by [CLAUDE.md](../CLAUDE.md).

Next: build the DOCX upload UI + server action + `mammoth` parse.

See [execution-plan.md](execution-plan.md) for the full milestone breakdown and [prd.md](prd.md) for product scope.

## Todos

- [x] **M1 — Project scaffold** (~0.5 h) — `npm run dev` boots a blank app; toolchain green
- [ ] **M2 — Upload + DOCX parse** (~1.0 h) — drop DOCX → see extracted text
- [ ] **M3 — Rubric + types + schema** (~0.75 h) — pure data module + zod schemas
- [ ] **M4 — LLM provider + quote verification** (~1.25 h) — `DeepSeekProvider` returns validated, quote-verified `AssessmentResult`
- [ ] **M5 — End-to-end pipeline** (~0.5 h) — drop DOCX → see real assessment as raw JSON
- [ ] **M6 — Results page UI** (~1.5 h) — demo-ready report (cards, badges, summary, disclaimer)
- [ ] **M7 — QA pass + polish + JSON download** (~1.0 h) — verdicts qualitatively correct on 3 MSAs

**Stretch (out of scope for v0):** PDF/markdown export, chunked >60k-token retrieval, severity weighting, eval harness.
