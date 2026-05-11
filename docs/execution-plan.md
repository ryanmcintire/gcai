# Execution Plan: Contract Benchmark Assistant Prototype

## Context

The repo at `/Users/ryanmcintire/dev/gcai` is greenfield — only [docs/prd.md](docs/prd.md) and [CLAUDE.md](../CLAUDE.md) exist. No package.json, no scaffolding, no `src/` tree.

The PRD specifies a 5–8 hour prototype: a Next.js web app where in-house counsel uploads a DOCX vendor contract and receives a structured triage report classifying 8 high-signal terms as `Standard | Aggressive | Favorable | Not Found`, with quoted clauses and rationale. One concrete LLM implementation (DeepSeek) ships in v0 behind a swappable `LLMProvider` interface.

This plan breaks delivery into **seven in-order milestones**, each producing something testable/demoable. Risk is front-loaded: DOCX parsing (M2) and the LLM contract (M4) — the two areas most likely to surface unknowns — are tackled before any UI polish.

---

## Milestone overview

| # | Milestone | Deliverable | Est. time |
|---|---|---|---|
| M1 | Project scaffold | `npm run dev` boots a blank app; toolchain green | 0.5 h |
| M2 | Upload + DOCX parse | Drop DOCX → see extracted text rendered | 1.0 h |
| M3 | Rubric + types + schema | Pure data module + zod schemas; tests pass | 0.75 h |
| M4 | LLM provider + quote verification | `DeepSeekProvider` returns validated, quote-verified `AssessmentResult` | 1.25 h |
| M5 | End-to-end pipeline | Drop DOCX → see real assessment as raw JSON | 0.5 h |
| M6 | Results page UI | Demo-ready report (cards, badges, summary, disclaimer) | 1.5 h |
| M7 | QA pass + polish + JSON download | Verdicts qualitatively correct on 3 MSAs; download report | 1.0 h |
| | **Total** | | **6.5 h** |

Stretch (cut if running long, per PRD §10): PDF/markdown export, chunked long-contract handling, per-term confidence scores, severity weighting.

---

## M1 — Project scaffold (~0.5 h)

**Goal:** Working Next.js 15 + TS toolchain that lints, type-checks, and tests cleanly.

**Tasks:**
- `npx create-next-app@latest` (Next 15, App Router, TS, Tailwind, ESLint, `src/` layout, no Turbopack opinion either way).
- Install: `mammoth`, `openai`, `zod`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Initialize shadcn/ui (`npx shadcn@latest init`) — default theme; install only `button`, `card`, `badge` for now.
- Add `vitest.config.ts` (jsdom env, path alias to match `tsconfig`).
- Wire `package.json` scripts per [CLAUDE.md](../CLAUDE.md): `dev`, `build`, `start`, `test`, `lint`, `lint:fix`, `typecheck`.
- Add `.env.example` with `LLM_PROVIDER=deepseek`, `LLM_MODEL=deepseek-chat`, `DEEPSEEK_API_KEY=`.
- Add `.env.local` to `.gitignore` (verify default).

**Verification:**
- `npm run dev` → `http://localhost:3000` shows a placeholder landing page.
- `npm run typecheck && npm run lint && npm run test` all pass (test suite empty is fine).

**Critical files created:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`, `.env.example`
- `src/app/page.tsx` (placeholder)

---

## M2 — Upload + DOCX parse (~1.0 h)

**Goal:** End user can drop a DOCX and see extracted plain text. Confront `mammoth` quirks early (PRD §12 risk).

**Tasks:**
- Build a single-page upload UI ([src/app/page.tsx](../src/app/page.tsx)) with a drag-drop dropzone + file input; gate to `.docx`, ≤10 MB, client-side validation.
- Server action `assessContract(formData)` in [src/app/actions.ts](../src/app/actions.ts) — for M2, returns just `{ filename, text }`.
- DOCX parser at [src/lib/parse.ts](../src/lib/parse.ts) using `mammoth.extractRawText({ buffer })`. Strip tracked-changes markup; return text preserving paragraph breaks.
- Render extracted text in a temporary `<pre>` block on the page (will be replaced in M6).
- Reject non-DOCX with a clear error toast/banner.

**Verification:**
- Manually upload 1 sample MSA; extracted text visible and readable.
- Upload `.pdf` or `.txt` → error shown, no server call.
- Upload >10 MB → rejected client-side.
- Unit test for `parse.ts` against a fixture DOCX in `src/lib/__fixtures__/`.

**Critical files:**
- [src/app/page.tsx](../src/app/page.tsx), [src/app/actions.ts](../src/app/actions.ts)
- [src/components/upload-form.tsx](../src/components/upload-form.tsx) (`'use client'`)
- [src/lib/parse.ts](../src/lib/parse.ts) + `parse.test.ts`

---

## M3 — Rubric + types + schema (~0.75 h)

**Goal:** All assessment-shape data is defined as code: rubric, types, zod validation. Zero I/O — pure data + tests.

**Tasks:**
- [src/types/assessment.ts](../src/types/assessment.ts) — types per PRD §6.2 / §8.1:
  - `Verdict = "Standard" | "Aggressive" | "Favorable" | "Not Found" | "Verification Failed"` (last is a discriminated state added by quote verification in M4).
  - `ExpectedPresence`, `NotFoundInterpretation` per §8.1.
  - `TermAssessment { termId, verdict, quotedClause, rationale, sectionRef }`.
  - `AssessmentResult { filename, summary, terms: TermAssessment[] }`.
- [src/lib/rubric.ts](../src/lib/rubric.ts) — exports the 8-term rubric as a typed array. Each entry: `{ id, label, expectedPresence, notFoundInterpretation, verdictCriteria: { aggressive, standard, favorable } }`. Verbatim text comes from PRD §8.1 + §8.2.
- [src/lib/schema.ts](../src/lib/schema.ts) — zod schema mirroring `AssessmentResult`; enforces `terms.length === 8` and termId enum.

**Verification:**
- Unit tests in [src/lib/rubric.test.ts](../src/lib/rubric.test.ts) and `schema.test.ts`: rubric has all 8 terms in PRD-fixed order; schema accepts a valid object, rejects missing/extra terms.
- `npm run typecheck` passes.

**Critical files:**
- [src/types/assessment.ts](../src/types/assessment.ts), [src/lib/rubric.ts](../src/lib/rubric.ts), [src/lib/schema.ts](../src/lib/schema.ts)

---

## M4 — LLM provider + quote verification (~1.25 h) ✅

**Goal:** A swappable `LLMProvider` with one concrete `DeepSeekProvider`. Output is zod-validated and quote-verified before returning. This is the credibility-critical milestone.

**Tasks:**
- [src/lib/llm/types.ts](../src/lib/llm/types.ts) — the `LLMProvider` interface from PRD §9.4: `assess(contractText, rubric) → Promise<AssessmentResult>`.
- [src/lib/llm/prompt.ts](../src/lib/llm/prompt.ts) — pure function building system + user messages from rubric + contract text. Truncate input at ~60k tokens with a flag in the result indicating truncation.
- [src/lib/llm/deepseek-provider.ts](../src/lib/llm/deepseek-provider.ts):
  - Uses `openai` SDK with `baseURL: "https://api.deepseek.com"`, `apiKey: process.env.DEEPSEEK_API_KEY`.
  - `response_format: { type: "json_object" }`, model from `process.env.LLM_MODEL ?? "deepseek-chat"`.
  - Parse → zod-validate → on failure, retry once with a "your previous response failed validation" follow-up message → if still invalid, throw.
- [src/lib/llm/verify-quotes.ts](../src/lib/llm/verify-quotes.ts) — for each term with a `quotedClause`, check verbatim substring presence in source text (after normalizing whitespace). Quotes that don't match get `verdict = "Verification Failed"` and a generic rationale; **never render an unverified quote** (CLAUDE.md mandate).
- [src/lib/llm/index.ts](../src/lib/llm/index.ts) — `getProvider()` factory reading `LLM_PROVIDER` env (only `"deepseek"` supported in v0; throw on unknown).
- Test [src/lib/llm/deepseek-provider.test.ts](../src/lib/llm/deepseek-provider.test.ts) using a **mock at the `LLMProvider` boundary** (CLAUDE.md mandate — not stubbing `fetch` or the SDK).
- Test [src/lib/llm/verify-quotes.test.ts](../src/lib/llm/verify-quotes.test.ts): pass / mismatch / whitespace-tolerant / not-found pass-through cases.

**Verification:**
- Unit tests pass.
- One smoke run against the real DeepSeek API on a small sample text returns a valid `AssessmentResult`.

**Critical files:**
- [src/lib/llm/types.ts](../src/lib/llm/types.ts), [src/lib/llm/prompt.ts](../src/lib/llm/prompt.ts), [src/lib/llm/deepseek-provider.ts](../src/lib/llm/deepseek-provider.ts), [src/lib/llm/verify-quotes.ts](../src/lib/llm/verify-quotes.ts), [src/lib/llm/index.ts](../src/lib/llm/index.ts)

---

## M5 — End-to-end pipeline (~0.5 h)

**Goal:** Connect M2 + M4. The server action returns a real `AssessmentResult`. Page shows raw JSON — UI is M6's job.

**Tasks:**
- Update [src/app/actions.ts](../src/app/actions.ts) `assessContract`:
  1. Validate file (size, mime).
  2. `parse(buffer)` (M2).
  3. `getProvider().assess(text, rubric)` (M4).
  4. `verifyQuotes(result, sourceText)` (M4).
  5. Return `AssessmentResult` (or a structured error).
- Render the returned object as `<pre>{JSON.stringify(result, null, 2)}</pre>` for now.
- Add a loading state while the action is pending.

**Verification:**
- Drop a real MSA; within ~30 s, see a populated JSON object with 8 terms in the expected order.
- Round-trip total < 45 s (PRD §11 success criterion).
- Type-check passes; existing unit tests pass.

---

## M6 — Results page UI (~1.5 h)

**Goal:** Demo-ready report rendering per PRD §7 / §6.3.

**Tasks:**
- [src/components/report.tsx](../src/components/report.tsx) — top-level results component:
  - Header: filename + summary count (`X aggressive · Y standard · Z favorable · N not found`).
  - Per-term `Card`s in fixed PRD-order, each with: verdict `Badge`, term label, section ref, quoted clause (monospace block), rationale.
  - Disclaimer banner: *"This is an automated triage tool. Not legal advice. Verify all findings against the source contract."*
- [src/components/verdict-badge.tsx](../src/components/verdict-badge.tsx) — badge color/variant by verdict, with **`notFoundInterpretation`-driven styling** when verdict is `Not Found`:
  - `red_flag` → red/warning treatment.
  - `neutral` → muted.
  - `favorable` → green.
  - `manual_review` → blue/info with a "verify" hint.
  - `Verification Failed` → distinct red-orange "Could not verify quote" treatment.
- Truncation warning banner when the prompt truncated the contract.
- Replace the `<pre>` block from M5 with `<Report />`.

**Verification:**
- Visual: drop one of the QA MSAs; report looks like the PRD §7 example.
- All 4 `notFoundInterpretation` styles render correctly (force each by stubbing the provider in dev).
- Mobile-friendly at ~375px width (cards stack).
- Component tests for `verdict-badge` and `report` (snapshot or RTL).

**Critical files:**
- [src/components/report.tsx](../src/components/report.tsx), [src/components/verdict-badge.tsx](../src/components/verdict-badge.tsx), [src/components/disclaimer.tsx](../src/components/disclaimer.tsx)

---

## M7 — QA pass + polish + JSON download (~1.0 h)

**Goal:** Verdicts are qualitatively correct on 3 MSAs; report is downloadable; rough edges smoothed.

**Tasks:**
- Run the app against 3 representative MSAs (sourced or synthesized — open question in PRD §12). Record verdicts; tune prompt / rubric phrasing if a clearly wrong call appears on ≥2 of 3.
- "Download JSON" button on the report — serializes the `AssessmentResult` as a `.json` blob.
- Error states: API error, validation-retry-failed, all-quotes-failed-verification (rare).
- Polished loading state (skeleton or progress indicator) per PRD §5.
- README quickstart: `cp .env.example .env.local`, set `DEEPSEEK_API_KEY`, `npm run dev`.

**Verification (PRD §11 success criteria):**
1. ≥2 of 3 MSAs have all 8 terms classified within reviewer agreement.
2. Every quoted clause appears verbatim in the source (enforced by M4's `verifyQuotes`).
3. Round-trip < 45 s on each.
4. Adding a hypothetical second `LLMProvider` would only require a new file in `src/lib/llm/` and an `LLM_PROVIDER` value — no changes to upload, parse, or rendering paths.

---

## Stretch (only if buffer remains)

- PDF / markdown export.
- Chunked long-contract handling for >60k tokens (per-term keyword-anchored windowing).
- Per-term severity weighting in summary.
- Eval harness with labeled contracts.

These are explicitly **out of scope for v0** per PRD §13 — listed here only to mark them as cuts.

---

## Cross-cutting conventions (from CLAUDE.md)

- Functional components, named exports (except Next.js-required defaults: `page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, route handlers).
- Server components by default; `'use client'` only where needed (upload form, download button).
- Tests co-located. Mock the LLM at the `LLMProvider` boundary, not at `fetch` or the SDK.
- Strict TS — no `any` without justifying comment. `interface` for object shapes; discriminated unions for verdict states.
- Conventional commits; `feature/` branches; always PR — never push to main.
- Run `npm run typecheck && npm run lint` before each commit.

## End-to-end verification (after M7)

1. `git clone` → `npm install` → `cp .env.example .env.local` → set `DEEPSEEK_API_KEY` → `npm run dev`.
2. `npm run typecheck && npm run lint && npm run test` all green.
3. Upload 3 sample MSAs; observe correct classifications, verbatim quotes, <45 s round-trip.
4. Force `Not Found` on a term (rubric-stub) and confirm each of the 4 `notFoundInterpretation` styles renders correctly.
5. Confirm provider abstraction holds: grep for `openai` / `deepseek` outside [src/lib/llm/](../src/lib/llm/) — should be zero hits.
