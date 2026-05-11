# Milestone: M7 — QA pass + polish + JSON download

Final demo polish. Adds the user-facing **Download JSON** button (PRD §5 step 5), tightens the loading and error states, surfaces an explicit signal when verification fails wholesale, and replaces the default Next.js README with a project-specific quickstart. Also verifies the provider abstraction holds via a grep gate.

**Out of automatable scope:** the *qualitative* 3-MSA QA pass (PRD §11.1) requires real vendor contracts and reviewer judgment — that step stays user-driven post-merge. status.md will record it as "code complete, manual QA pending." Everything else lands in this milestone.

**Design notes:**

1. **Download button is a separate client component**, not folded into `Report`. Keeps `Report` server-renderable and presentational. The button generates a Blob, creates an object URL, programmatically clicks an `<a download>`, then revokes the URL — the standard browser pattern. Filename: replace a trailing `.docx` (case-insensitive) on `result.filename` with `.assessment.json`; fall back to `assessment.json` if no `.docx` suffix.
2. **Loading state** stays simple — add an `animate-spin` SVG ring next to the existing copy. Tailwind already supports `animate-spin`; no new dependencies. The change is purely visual; existing `aria-busy` plumbing is unchanged.
3. **All-verification-failed banner** triggers when every term came back `Verification Failed` (a strong signal of LLM-quote misalignment or upstream parse damage). Threshold: `summary.verificationFailed === terms.length && terms.length > 0`. Distinct red-orange treatment to mirror the per-card badge style; copy invites the user to retry the upload. Not gated on a partial-failure threshold — partial failures already render per-card via the existing summary sub-line.
4. **Error state coverage** for M7 is verified through the existing `actions.test.ts` cases (LLM error, validation-retry failed, generic-error) plus the new all-verification-failed UI banner. No new error pathways are needed — the M5 wiring already routes `ParseError`, `LLMProviderError`, and final schema-validation failures into the user-facing error banner.
5. **README** keeps the existing Next.js template content out — replace with project-specific quickstart referencing `docs/prd.md`, `docs/execution-plan.md`, and the env setup. Brief on purpose; the docs/ tree is the source of truth.
6. **Provider abstraction check** is a one-line grep — fast verification that nothing outside `src/lib/llm/` references `openai` or `deepseek` directly. If a hit appears, fix it before commit.
7. **Component tests** for new behavior use the existing jsdom + RTL setup. For the download button, mock `URL.createObjectURL` / `URL.revokeObjectURL` and spy on the synthesized anchor click; do not actually open a download.

## Todos

- [x] **Create `DownloadJsonButton` client component** — `'use client'`. Named export `DownloadJsonButton` with props interface `DownloadJsonButtonProps { result: AssessmentResult }`. Renders a `<Button variant="outline" size="sm">Download JSON</Button>`. onClick:
  1. `const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })`.
  2. `const url = URL.createObjectURL(blob)`.
  3. Build `a = document.createElement("a")`, set `a.href = url`, `a.download = downloadName(result.filename)`, append to body, click, remove.
  4. `URL.revokeObjectURL(url)`.
  Helper `downloadName(filename: string): string` — if `filename` ends with `.docx` (case-insensitive), return `filename.slice(0, -5) + ".assessment.json"`; otherwise return `"assessment.json"`. Export the helper for unit testing.
  _Done when: file compiles under strict TS; the component renders a single button labeled "Download JSON"; no `any`._
  Files: `src/components/download-json-button.tsx`

- [x] **Wire `DownloadJsonButton` into `Report`** — Import `DownloadJsonButton`. In the header block, place the button right-aligned next to the filename/summary text block (use `flex justify-between items-start gap-2`). Pass `result` through. Do not duplicate it anywhere else in the layout. _Done when: a successful upload renders a "Download JSON" button alongside the filename header in the report; no visual regression on the cards below._ Files: `src/components/report.tsx`

- [x] **Unit test `DownloadJsonButton`** — `// @vitest-environment jsdom`. Build a hand-rolled `AssessmentResult` with `filename: "acme-msa.docx"`. Stub `URL.createObjectURL` (`vi.stubGlobal("URL.createObjectURL", ...)` or `vi.spyOn(URL, "createObjectURL")`) to return `"blob:mock"` and capture the `Blob` argument; stub `URL.revokeObjectURL`. Render `<DownloadJsonButton>`, click via `userEvent` or `fireEvent`, then assert:
  1. `createObjectURL` was called with a `Blob` whose text content (await `blob.text()`) equals `JSON.stringify(result, null, 2)`.
  2. `revokeObjectURL` was called with `"blob:mock"`.
  3. An `<a>` with `download="acme-msa.assessment.json"` was synthesized (spy on `document.createElement` or assert on captured anchor attributes).
  4. The synthesized anchor was removed from the DOM after click.
  5. Unit-test `downloadName` directly: `"foo.docx"` → `"foo.assessment.json"`, `"foo.DOCX"` → `"foo.assessment.json"`, `"bar"` (no extension) → `"assessment.json"`, `"x.pdf"` (wrong extension) → `"assessment.json"`.
  _Done when: 5+ assertions pass; `npm run test -- --run src/components/download-json-button.test.tsx` exits 0._
  Files: `src/components/download-json-button.test.tsx`

- [x] **Polished loading state with spinner** — In `src/components/upload-form.tsx`, when `isPending`, render a small spinner alongside the existing copy. Add an inline SVG (`<svg className="h-4 w-4 animate-spin ...">` with a circle outline + an arc — standard pattern) only inside the `isPending` branch. Wrap spinner + text in a `<div className="flex items-center gap-2">`. Keep `aria-busy` on the dropzone. _Done when: while `isPending`, an animated spinner shows next to "Parsing DOCX and assessing terms…"; idle state is unchanged._ Files: `src/components/upload-form.tsx`

- [x] **Add all-verification-failed banner to `Report`** — Render a top-of-cards banner (above the per-term card list, below the truncation banner) when `summary.verificationFailed === terms.length && terms.length > 0`. Distinct red-orange treatment (border + background, e.g., `border-orange-300/60 bg-orange-50 text-orange-900` with dark variants matching the existing truncation banner). Copy: *"None of the quoted clauses could be verified against the contract text. The assessment may not be reliable — try re-uploading the contract."* Use `role="alert"`. _Done when: when 8/8 terms have `Verification Failed`, the banner renders above the cards; when at least one term has any other verdict, the banner does not render._ Files: `src/components/report.tsx`

- [x] **Extend `Report` test coverage** — In `src/components/report.test.tsx`, add cases:
  1. The "Download JSON" button is rendered in the report header (assert by accessible name).
  2. When the fixture has all 8 terms set to `Verification Failed` (build a dedicated fixture), the all-verification-failed banner renders (assert via `getByRole("alert", { name: /quoted clauses could be verified/i })` or `getByText(/None of the quoted clauses could be verified/i)`).
  3. When the existing mixed-verdict fixture is used, the all-verification-failed banner does NOT render (`queryByText(/None of the quoted clauses could be verified/i)` is null).
  _Done when: existing 8 assertions still pass, 3 new assertions pass; `npm run test -- --run src/components/report.test.tsx` exits 0._
  Files: `src/components/report.test.tsx`

- [x] **Rewrite README with project quickstart** — Replace the default `create-next-app` README with project-specific content. Sections:
  1. Title + one-line description (DOCX contract triage tool).
  2. Pointer line to `docs/prd.md` (product spec) and `docs/execution-plan.md` (milestones).
  3. **Prerequisites:** Node 20+, a DeepSeek API key.
  4. **Setup:** `npm install`, `cp .env.example .env.local`, set `DEEPSEEK_API_KEY`.
  5. **Commands:** `npm run dev` (localhost:3000), `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`.
  6. **Scope:** stateless, no auth, no persistence, `.docx` only, ≤10 MB, see PRD §3 for full scope cuts.
  _Done when: README has no remaining `create-next-app` template text; renders coherently as a project quickstart._
  Files: `README.md`

- [x] **Verify provider abstraction (grep gate)** — Run `grep -RIn --include='*.ts' --include='*.tsx' -E 'openai|deepseek' src/ | grep -v '^src/lib/llm/'`. Expected: zero output (success criterion PRD §11.4). If hits surface, fix them before continuing. Also check `import { OpenAI }` and any direct SDK references. Record the result in `docs/status.md` (e.g., "Provider abstraction grep: 0 hits outside src/lib/llm/"). _Done when: the grep command exits with no output; status.md is updated with the result._ Files: (verification only; `docs/status.md` for the note)

- [x] **Toolchain green** — `npm run typecheck && npm run lint && npm run test` all exit 0. No new `any`. No new dependencies. _Done when: all three commands exit 0._
