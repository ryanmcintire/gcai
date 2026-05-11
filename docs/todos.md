# Milestone: M5 — End-to-end pipeline

Connect M2 (upload+parse) to M4 (provider+verify). The server action returns a real `AssessmentResult`; the page renders it as raw JSON. UI polish (cards, badges, summary) belongs to M6 and is **out of scope** here.

**Design notes:**

1. **`AssessResult` success variant becomes `{ ok: true; result: AssessmentResult }`** — drops the M2 placeholder `text` field. `filename` lives inside `result.filename`. The action is the only place that attaches `filename` to the `ProviderAssessmentResult`.
2. **Defensive final-schema check** — even though `DeepSeekProvider` already validates with `llmOutputSchema`, the assembled `AssessmentResult` (filename + summary + terms + truncated) is parsed through `assessmentResultSchema` as a last-mile guard before returning to the client. Cheap, and means schema drift cannot leak.
3. **Error taxonomy** — three failure shapes mapped to `{ ok: false, error }`:
   - File validation (size/empty/non-docx) — existing copy.
   - `ParseError` — existing copy.
   - `LLMProviderError` — surface the provider's `message` (it's already user-safe — e.g., "DEEPSEEK_API_KEY is not set", "LLM produced invalid output after one retry").
   - Anything else — generic "Assessment failed; please try again." with `console.error` server-side.
4. **Mock at the `LLMProvider` boundary, not the SDK** — CLAUDE.md mandate. Tests mock `@/lib/llm`'s `getProvider` to return a hand-built provider; they do not stub `fetch` or the OpenAI client.

## Todos

- [x] **Update `AssessResult` shape in `src/app/actions.ts`** — Change the success variant from `{ ok: true; filename: string; text: string }` to `{ ok: true; result: AssessmentResult }`. Import `AssessmentResult` from `@/types/assessment`. Keep the failure variant unchanged. _Done when: type is updated; file compiles after the next todo wires the real return value._ Files: `src/app/actions.ts`

- [x] **Wire LLM + verifyQuotes into `assessContract`** — After the successful `parseDocx(buffer)`, in order:
  1. `const provider = getProvider();` (import from `@/lib/llm`)
  2. `const providerResult = await provider.assess(text, rubric);` (import `rubric` from `@/lib/rubric`)
  3. `const verified = verifyQuotes(providerResult, text);` (import from `@/lib/llm/verify-quotes`)
  4. `const result: AssessmentResult = { filename: file.name, ...verified };`
  5. Run `assessmentResultSchema.safeParse(result)` — if `success: false`, `console.error` the issues and return `{ ok: false, error: "Assessment output failed validation. Please try again." }`.
  6. Return `{ ok: true, result }`.
  _Done when: the happy path produces a populated `AssessmentResult` with `filename`, `summary`, 8 `terms`, and the optional `truncated` flag bubbled up from the provider._ Files: `src/app/actions.ts`

- [x] **Add LLM-error branch + tighten generic copy in action's catch** — In the existing `try/catch`:
  1. Add `if (err instanceof LLMProviderError) return { ok: false, error: err.message };` before the generic fallback. Import `LLMProviderError` from `@/lib/llm`.
  2. Keep the `ParseError` branch returning its existing parse-specific copy.
  3. Change the generic fallback message from `"Could not read this DOCX. Please try a different file."` to `"Could not complete the assessment. Please try again."` — the old copy is misleading now that the catch covers both parse and LLM failure modes (parse failures still hit the `ParseError` branch above).
  Keep `console.error("assessContract failed", err)` in the generic branch. _Done when: an `LLMProviderError` thrown from `assess` surfaces its message to the UI without a stack; `ParseError` keeps its DOCX-specific copy; anything else returns the generic assessment-failure message._ Files: `src/app/actions.ts`

- [x] **Render the JSON result in `upload-form.tsx`** — Replace `<pre>{success.text}</pre>` with `<pre>{JSON.stringify(success.result, null, 2)}</pre>` and the filename label `{success.filename}` with `{success.result.filename}`. _Done when: a successful upload shows pretty-printed JSON with summary + 8 terms in PRD-fixed order; no stale `success.text` reference remains._ Files: `src/components/upload-form.tsx`

- [x] **Update busy-state copy** — Change the dropzone's `isPending` label from `"Parsing DOCX…"` to `"Parsing DOCX and assessing terms…"` so the user understands the LLM call is the slow phase. Keep `aria-busy` plumbing untouched. _Done when: while the action is in flight, the dropzone shows the new copy._ Files: `src/components/upload-form.tsx`

- [x] **Update the page's intro copy** — Edit `src/app/page.tsx` to replace the M2-era subtitle ("Extracted text appears below — the structured assessment lands in a later milestone.") with a one-liner that matches M5 reality, e.g., "Upload a vendor DOCX (≤10 MB). The assessment appears below as JSON; a polished report lands in M6." _Done when: the page no longer claims the assessment is a later milestone._ Files: `src/app/page.tsx`

- [x] **Tests: server action happy + error paths** — Create `src/app/actions.test.ts`. Mock the LLM at the `LLMProvider` boundary (CLAUDE.md mandate) using:
  ```ts
  vi.mock("@/lib/llm", async () => {
    const actual = await vi.importActual<typeof import("@/lib/llm")>("@/lib/llm");
    return { ...actual, getProvider: vi.fn() };
  });
  ```
  (so `LLMProviderError` remains the real class for `instanceof` checks). Also `vi.mock("@/lib/parse", ...)` so the action doesn't touch mammoth; have `parseDocx` resolve with a known source text whose substrings match the happy-path provider's quotes. Build a minimal `File` from `new File([new Uint8Array([0])], "test.docx", { type: DOCX_MIME })` — the bytes don't matter because `parseDocx` is mocked. Cases:
  - (a) **Happy path** — provider returns a `ProviderAssessmentResult` with summary + 8 terms in PRD-fixed order; all `Standard`/`Aggressive`/`Favorable` quotes are substrings of the mocked parsed text. Action returns `{ ok: true, result }`. Assertions: `result.filename === "test.docx"`; `result.terms.length === 8`; `result.terms.map(t => t.termId)` matches PRD-fixed order from `rubric`; `result.summary` matches the provider's output (no downgrades); `assess` called once with `(parsedText, rubric)`.
  - (b) **Truncated bubbles through** — provider returns `truncated: true`. Action's `result.truncated === true`.
  - (c) **`verifyQuotes` is in the pipeline** — provider returns one term with a quotedClause NOT in the mocked source text. Action's corresponding term has `verdict === "Verification Failed"` and `result.summary.verificationFailed === 1`. (Quick wiring check; deep coverage lives in `verify-quotes.test.ts`.)
  - (d) **`LLMProviderError`** — mocked `assess` rejects with `new LLMProviderError("DEEPSEEK_API_KEY is not set")`. Action returns `{ ok: false, error: "DEEPSEEK_API_KEY is not set" }`.
  - (e) **Schema validation failure** — mocked `assess` resolves with a malformed `ProviderAssessmentResult` (e.g., only 7 terms). Action returns `{ ok: false, error: "Assessment output failed validation. Please try again." }`.
  - (f) **File-validation short-circuits before provider** — a non-`.docx` (or oversize/empty) file returns the existing error and the mocked `assess` is **not** called.
  - (g) **Generic error** — mocked `assess` rejects with `new Error("boom")` (not `LLMProviderError`, not `ParseError`). Action returns `{ ok: false, error: "Could not complete the assessment. Please try again." }`.
  _Done when: all 7 cases green under `npm run test`._ Files: `src/app/actions.test.ts`

- [x] **Toolchain green** — `npm run typecheck && npm run lint && npm run test` all exit 0. No new `any`. No direct LLM SDK calls outside `src/lib/llm/`. No `openai`/`deepseek` references in `src/app/` or `src/components/`. _Done when: all three commands exit 0._
