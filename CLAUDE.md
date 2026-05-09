# gcai — Contract Benchmark Assistant

Read-only DOCX triage tool.

- [docs/prd.md](docs/prd.md) — product spec, user flow, rubric, and success criteria. Consult before changing scope or behavior.
- [docs/execution-plan.md](docs/execution-plan.md) — milestone-by-milestone build plan (M1–M7) with goals, tasks, and verification per milestone.
- [docs/status.md](docs/status.md) — current focus and milestone todos. Keep in sync as work progresses.

Stateless Next.js 16 (App Router) + TypeScript 5.x. No auth, no database, no upload history.

## Stack

- **Framework:** Next.js 16 App Router (Turbopack is the dev default); server actions handle upload + LLM call. See [AGENTS.md](AGENTS.md) — Next 16 has breaking changes; consult `node_modules/next/dist/docs/` for current API before relying on prior knowledge.
- **UI:** Tailwind + shadcn/ui (no CSS Modules, no inline styles)
- **DOCX:** `mammoth` (server-side)
- **LLM SDK:** `openai` package with DeepSeek `baseURL` — DeepSeek's own docs prescribe this. Do not add `@ai-sdk/deepseek` or another AI SDK.
- **Validation:** `zod` on LLM JSON output; retry once on schema failure
- **Tests:** Vitest + React Testing Library
- **Hosting:** Vercel

## Commands

- `npm run dev` (port 3000) · `npm run build` · `npm run start`
- `npm run test` — Vitest. Single file: `npm run test -- --run path/to/file.test.ts`
- `npm run lint` / `lint:fix` · `npm run typecheck`
- Always run `npm run typecheck && npm run lint` before committing.

## Layout

- `src/app/` routes + server actions · `src/components/` UI · `src/lib/` server logic (parse, prompt, rubric) · `src/lib/llm/` `LLMProvider` interface + `DeepSeekProvider` · `src/types/` shared types

## LLM Provider

Single `LLMProvider` interface; ship **only** `DeepSeekProvider` in v0. Future providers slot in without touching upload/parse/render. Select via env: `LLM_PROVIDER` (default `deepseek`), `LLM_MODEL` (default `deepseek-chat`), `DEEPSEEK_API_KEY`. One JSON-mode call per contract; truncate text at ~60k tokens with a UI warning.

**Quote verification (credibility-critical):** every `quoted_clause` must be a verbatim substring of the source text. If not, mark the term `Verification Failed` — never render an unverified quote.

## Conventions

- Functional components only; named exports — except Next.js files that require defaults (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, route handlers, middleware)
- Co-locate tests next to source. Props interface `{Component}Props`; destructure in signature.
- Prefer server components; add `'use client'` only when needed.
- Strict TS — no `any` without a justifying comment. `interface` for object shapes; discriminated unions for verdict states.
- Mock the LLM at the `LLMProvider` boundary, not by stubbing `fetch` or the SDK.
- Conventional commits (feat/fix/chore/docs/test); branches `feature/` `fix/` `chore/`; always PR, never push to main.

## Scope Limits (v0 — binding, see PRD §3)

No auth, persistence, PDF/OCR/`.doc`, redlines, additional LLM providers, chunked >60k-token retrieval, integrations, or eval harness. Do not add new dependencies, default exports outside Next.js requirements, or direct LLM SDK calls outside `LLMProvider`. Never commit secrets.
