# Status

## Current focus

**M1 — Project scaffold** (not started)

Stand up Next.js 15 + TS + Tailwind + shadcn/ui + Vitest. Wire `package.json` scripts, `.env.example`, and confirm `npm run dev / typecheck / lint / test` are all green on a placeholder page.

See [execution-plan.md](execution-plan.md) for the full milestone breakdown and [prd.md](prd.md) for product scope.

## Todos

- [ ] **M1 — Project scaffold** (~0.5 h) — `npm run dev` boots a blank app; toolchain green
- [ ] **M2 — Upload + DOCX parse** (~1.0 h) — drop DOCX → see extracted text
- [ ] **M3 — Rubric + types + schema** (~0.75 h) — pure data module + zod schemas
- [ ] **M4 — LLM provider + quote verification** (~1.25 h) — `DeepSeekProvider` returns validated, quote-verified `AssessmentResult`
- [ ] **M5 — End-to-end pipeline** (~0.5 h) — drop DOCX → see real assessment as raw JSON
- [ ] **M6 — Results page UI** (~1.5 h) — demo-ready report (cards, badges, summary, disclaimer)
- [ ] **M7 — QA pass + polish + JSON download** (~1.0 h) — verdicts qualitatively correct on 3 MSAs

**Stretch (out of scope for v0):** PDF/markdown export, chunked >60k-token retrieval, severity weighting, eval harness.
