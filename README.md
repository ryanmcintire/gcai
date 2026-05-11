# gcai — Contract Benchmark Assistant

A read-only DOCX contract triage tool. Upload a vendor contract (`.docx`, ≤10 MB) and receive a structured report classifying 8 high-signal terms as **Standard / Aggressive / Favorable / Not Found** against B2B SaaS norms, with quoted clauses and one-sentence rationale per term.

See [docs/prd.md](docs/prd.md) for the product spec, rubric, and success criteria, and [docs/execution-plan.md](docs/execution-plan.md) for the milestone build plan.

## Prerequisites

- Node.js 20 or newer
- A DeepSeek API key (the v0 LLM provider)

## Setup

```bash
npm install
cp .env.example .env.local
# then edit .env.local and set DEEPSEEK_API_KEY=...
```

`.env.local` is gitignored by default. Other env vars are pre-set in `.env.example`:

- `LLM_PROVIDER=deepseek` (only value supported in v0)
- `LLM_MODEL=deepseek-chat`

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Run the production server |
| `npm run test` | Run the Vitest suite |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | TypeScript type-check |

Run `npm run typecheck && npm run lint` before committing.

## Scope

The v0 prototype is intentionally narrow per PRD §3:

- Stateless — no auth, no database, no upload history.
- `.docx` only (no PDF, OCR, or legacy `.doc`).
- Single LLM provider implementation (DeepSeek) behind a swappable `LLMProvider` interface.
- One JSON-mode call per contract; contracts beyond ~60k tokens are truncated with a UI warning.
- No redlines, no negotiation guidance, no integrations.

See PRD §13 for the full list of explicit non-goals.
