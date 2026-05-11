# Milestone: M6 — Results page UI

Demo-ready report rendering per PRD §7 / §6.3. Replaces M5's raw-JSON `<pre>` block with cards, badges, summary, and a disclaimer. UI is purely presentational over the existing `AssessmentResult`.

**Design notes:**

1. **Rubric lookup is by `termId`.** Cards render in `rubric` order (the PRD-fixed canonical order). The component zips `result.terms` (already in PRD order — the server action guarantees it) with `rubric` so the renderer has access to each term's `label` and `notFoundInterpretation` without the LLM ever computing them.
2. **Badge styling vs. `Not Found` styling is two-axis.** The verdict drives the badge label and base color (`Aggressive` / `Standard` / `Favorable` / `Not Found` / `Verification Failed`). When verdict is `Not Found`, the badge variant is further refined by the term's `notFoundInterpretation` (red_flag / neutral / favorable / manual_review). `Verification Failed` is its own treatment — distinct red-orange — and ignores `notFoundInterpretation`.
3. **Summary copy mirrors PRD §7.** `X Aggressive · Y Standard · Z Favorable · N Not Found` — `Verification Failed` is *not* in the headline summary (per PRD §7's "Summary:" line) but verification-failed terms still render their card with the distinct treatment. If `verificationFailed > 0`, append a quieter second line `· M could not be verified` so reviewers see the count.
4. **Truncation banner is informational, not destructive.** When `result.truncated === true`, show a one-line amber notice above the cards: "Contract text was truncated to fit the assessment window — verdicts cover the first portion of the document only."
5. **Disclaimer banner is unconditional**, per PRD §6.3 verbatim: *"This is an automated triage tool. Not legal advice. Verify all findings against the source contract."*
6. **Mobile-first.** Cards stack by default (single-column flex/grid); no responsive breakpoints required for the v0 demo. Long `quotedClause` strings wrap via `whitespace-pre-wrap break-words` in a monospace block.
7. **Component tests use jsdom.** Existing convention: `// @vitest-environment jsdom` at the top of `.test.tsx` files for components. RTL + `@testing-library/jest-dom/vitest` matchers are already wired via `vitest.setup.ts`.

## Todos

- [x] **Create `Disclaimer` component** — Pure presentational. Renders a small banner with the verbatim PRD §6.3 text and a muted-warning treatment (e.g., amber-tinted border + background). No props. Named export `Disclaimer`. _Done when: the component renders the exact PRD §6.3 string; visible-and-styled; no `'use client'`._ Files: `src/components/disclaimer.tsx`

- [x] **Create `VerdictBadge` component + variant map** — Named export `VerdictBadge` with props interface `VerdictBadgeProps { verdict: Verdict; notFoundInterpretation: NotFoundInterpretation }`. Reuses `Badge` from `@/components/ui/badge` with a `className` override per verdict:
  - `Aggressive` → red/destructive treatment (red background, red text).
  - `Standard` → muted/neutral (slate or zinc background).
  - `Favorable` → green/positive (emerald background, emerald text).
  - `Verification Failed` → amber-red "Could not verify" treatment, label text `"Verification Failed"`.
  - `Not Found` → look up `notFoundInterpretation`:
    - `red_flag` → red/destructive variant, label `"Not Found — Red Flag"`.
    - `neutral` → muted variant, label `"Not Found"`.
    - `favorable` → green variant, label `"Not Found — Favorable"`.
    - `manual_review` → blue/info variant, label `"Not Found — Verify"`.
  Implementation: a pure switch on `verdict`, with the `Not Found` arm switching on `notFoundInterpretation`. Define a `BADGE_LABELS` and `BADGE_CLASSES` map keyed by a discriminated string (`"aggressive" | "standard" | "favorable" | "verification_failed" | "not_found:red_flag" | "not_found:neutral" | "not_found:favorable" | "not_found:manual_review"`) to keep the JSX a single `<Badge>` element.
  _Done when: file compiles under strict TS; all 8 visual states are reachable; no `any`._ Files: `src/components/verdict-badge.tsx`

- [x] **Create `Report` component** — Top-level presentational. Props: `ReportProps { result: AssessmentResult }`. Renders, in order:
  1. **Header** — `result.filename` (semibold), and the summary line: `${summary.aggressive} Aggressive · ${summary.standard} Standard · ${summary.favorable} Favorable · ${summary.notFound} Not Found`. If `summary.verificationFailed > 0`, append a smaller line `${summary.verificationFailed} could not be verified`.
  2. **Truncation banner** — only if `result.truncated === true`. Amber-tinted box with the design-note copy.
  3. **Per-term cards** — iterate over `rubric` (imported from `@/lib/rubric`) and find the matching `result.terms.find(t => t.termId === rubricTerm.id)` (defensive — if missing, skip). Each card contains:
     - Each card gets `data-term-id={rubricTerm.id}` for stable test ordering.
     - Header row: `<VerdictBadge>` + the rubric term `label` (semibold) + `sectionRef` muted on the right if present.
     - For `Not Found` / `Verification Failed`: skip the quoted clause; render rationale directly.
     - For other verdicts: a `<pre>` with `whitespace-pre-wrap break-words font-mono text-xs` containing `quotedClause`, then the rationale below it.
  4. **Disclaimer** — `<Disclaimer />` at the bottom.
  Layout: `flex flex-col gap-4`, single column. Use shadcn `Card` / `CardHeader` / `CardContent`. No `'use client'`.
  _Done when: given a hand-built `AssessmentResult` with 8 terms in PRD-fixed order, the component renders 8 cards with badges, term labels, quotes/rationales, and the disclaimer; truncation banner appears iff `truncated === true`._ Files: `src/components/report.tsx`

- [x] **Replace JSON `<pre>` in `upload-form.tsx` with `<Report />`** — In the success branch, replace `<pre>{JSON.stringify(success.result, null, 2)}</pre>` with `<Report result={success.result} />`. Keep the "Upload another" button. Remove the now-orphan filename label above the result (Report's header carries the filename — avoid duplication). _Done when: a successful upload shows the rendered report instead of raw JSON; "Upload another" still works; no duplicate filename display._ Files: `src/components/upload-form.tsx`

- [x] **Update page intro copy for M6 reality** — Edit `src/app/page.tsx` to drop the "appears below as JSON; a polished report lands in a later milestone" line. New subtitle: "Upload a vendor DOCX (≤10 MB) to get a structured triage report against B2B SaaS norms across 8 high-signal terms." _Done when: page copy no longer references "JSON" or "later milestone"._ Files: `src/app/page.tsx`

- [x] **Test `VerdictBadge` — all 8 visual states** — Create `src/components/verdict-badge.test.tsx` with `// @vitest-environment jsdom` directive. Render each combination once and assert: (1) badge text label matches the expected copy from the design notes; (2) `data-slot="badge"` element is present; (3) for `Not Found` variants, the rendered label differs across the 4 `notFoundInterpretation` values; (4) `Aggressive` and `Not Found / red_flag` both render but produce **different labels** so they're distinguishable to the user. Use `render` + `screen.getByText` from RTL. _Done when: 8 assertions pass; `npm run test -- --run src/components/verdict-badge.test.tsx` exits 0._ Files: `src/components/verdict-badge.test.tsx`

- [x] **Test `Report` rendering** — Create `src/components/report.test.tsx` with `// @vitest-environment jsdom`. Build a hand-rolled `AssessmentResult` with 8 terms (mix of verdicts to cover Standard, Aggressive, Favorable, Not Found, Verification Failed at least once). Cases:
  - (a) Filename and summary line render (`X Aggressive · Y Standard · Z Favorable · N Not Found`) with the correct counts.
  - (b) Disclaimer text from PRD §6.3 is present verbatim.
  - (c) When `truncated === true`, the truncation banner text is visible; when `truncated === false`, it is not.
  - (d) For a `Standard` term, the `quotedClause` text is rendered.
  - (e) For a `Not Found` term, the `quotedClause` is NOT rendered (only rationale).
  - (f) For a `Verification Failed` term, the `quotedClause` is NOT rendered (only rationale); the badge label reflects the verification-failed state.
  - (g) Cards render in PRD-fixed `rubric` order — query `container.querySelectorAll("[data-term-id]")` and assert the sequence of `getAttribute("data-term-id")` values matches `rubric.map(r => r.id)`.
  - (h) When `summary.verificationFailed > 0`, the "could not be verified" sub-line renders. When `summary.verificationFailed === 0` (separate fixture), that sub-line does NOT render — assert `queryByText(/could not be verified/i)` is null.
  _Done when: all 8 assertions pass._ Files: `src/components/report.test.tsx`

- [x] **Toolchain green** — `npm run typecheck && npm run lint && npm run test` all exit 0. No new `any`. No business logic in components (no fetch, no parsing — pure presentation over `AssessmentResult`). _Done when: all three commands exit 0._
