# Status

## Current focus

**M3 — Rubric + types + schema** (next)

M2 shipped: drag-drop upload, `assessContract` server action, `parseDocx` using `mammoth.extractRawText`. Result rendered in `<pre>` for paragraph-break verification. Tracked-changes confirmed handled by mammoth defaults — no manual stripping. `serverActions.bodySizeLimit` set to `11mb` in [next.config.ts](../next.config.ts). 4 new tests green against `src/lib/__fixtures__/sample.docx`.

**Pending manual fidelity probes before M3** (per execution plan): drop a real MSA with auto-numbered sections AND a pricing/SLA table; confirm section markers (`5.2(a)`) survive and tables read coherently. If either fails, escalate to `mammoth.convertToHtml` + custom HTML→text transformer before starting rubric work.

See [execution-plan.md](execution-plan.md) for the full milestone breakdown and [prd.md](prd.md) for product scope.

## Todos

- [x] **M1 — Project scaffold** (~0.5 h) — `npm run dev` boots a blank app; toolchain green
- [x] **M2 — Upload + DOCX parse** (~1.0 h) — drop DOCX → see extracted text
- [ ] **M3 — Rubric + types + schema** (~0.75 h) — pure data module + zod schemas
- [ ] **M4 — LLM provider + quote verification** (~1.25 h) — `DeepSeekProvider` returns validated, quote-verified `AssessmentResult`
- [ ] **M5 — End-to-end pipeline** (~0.5 h) — drop DOCX → see real assessment as raw JSON
- [ ] **M6 — Results page UI** (~1.5 h) — demo-ready report (cards, badges, summary, disclaimer)
- [ ] **M7 — QA pass + polish + JSON download** (~1.0 h) — verdicts qualitatively correct on 3 MSAs

**Stretch (out of scope for v0):** PDF/markdown export, chunked >60k-token retrieval, severity weighting, eval harness.
