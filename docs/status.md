# Status

## Current focus

**M4 — LLM provider + quote verification** (complete). Next: **M5 — End-to-end pipeline**.

M4 shipped: `src/lib/llm/types.ts` (`LLMProvider` interface, `ProviderAssessmentResult = Omit<AssessmentResult, "filename">`, `LLMProviderError`); `src/lib/llm/prompt.ts` (`MAX_CONTRACT_CHARS = 240_000` char-based truncation proxy for ~60k tokens; system prompt embeds 8-row rubric verbatim with all 3 verdict-criteria buckets per term, PRD-fixed order, JSON-only output instruction); `src/lib/llm/deepseek-provider.ts` (constructor-injectable `OpenAILike` structural type for testability; `chat.completions.create` with `response_format: json_object`; retry-once-then-throw on parse failure, empty content, or zod validation failure including duplicate termIds; corrective-feedback message threaded into retry); `src/lib/llm/verify-quotes.ts` (whitespace-tolerant verbatim substring check; downgrade to `Verification Failed` with empty quote and null sectionRef when quote not found; summary recomputed; pure function — does not mutate input); `src/lib/llm/index.ts` (`getProvider()` factory reading `LLM_PROVIDER`/`LLM_MODEL`/`DEEPSEEK_API_KEY`, only `deepseek` supported in v0); `src/lib/schema.ts` extended with `llmOutputSchema` enforcing 8 unique-id terms on raw LLM output. Tests: 28 new cases — `verify-quotes.test.ts` (8), `prompt.test.ts` (6), `deepseek-provider.test.ts` (6), `index.test.ts` (4), `schema.test.ts` +4 for llmOutputSchema. Full toolchain green — typecheck, lint, 51 tests across 9 files.

**Pending manual fidelity probes before M5** (per execution plan, deferred from pre-M3): drop a real MSA with auto-numbered sections AND a pricing/SLA table; confirm section markers (`5.2(a)`) survive and tables read coherently. If either fails, escalate to `mammoth.convertToHtml` + custom HTML→text transformer before the end-to-end pipeline wiring.

**Smoke-test deferral:** Execution plan §M4 calls for "one smoke run against the real DeepSeek API on a small sample text" — naturally exercised by M5's full upload→assess flow against a real MSA; no separate harness built.

See [execution-plan.md](execution-plan.md) for the full milestone breakdown and [prd.md](prd.md) for product scope.

## Todos

- [x] **M1 — Project scaffold** (~0.5 h) — `npm run dev` boots a blank app; toolchain green
- [x] **M2 — Upload + DOCX parse** (~1.0 h) — drop DOCX → see extracted text
- [x] **M3 — Rubric + types + schema** (~0.75 h) — pure data module + zod schemas
- [x] **M4 — LLM provider + quote verification** (~1.25 h) — `DeepSeekProvider` returns validated, quote-verified `AssessmentResult`
- [ ] **M5 — End-to-end pipeline** (~0.5 h) — drop DOCX → see real assessment as raw JSON
- [ ] **M6 — Results page UI** (~1.5 h) — demo-ready report (cards, badges, summary, disclaimer)
- [ ] **M7 — QA pass + polish + JSON download** (~1.0 h) — verdicts qualitatively correct on 3 MSAs

**Stretch (out of scope for v0):** PDF/markdown export, chunked >60k-token retrieval, severity weighting, eval harness.
