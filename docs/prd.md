# Contract Benchmark Assistant — Prototype PRD

**Status:** Draft v0.1
**Author:** Ryan McIntire
**Date:** 2026-05-08
**Time budget:** 5–8 hours end-to-end

---

## 1. Problem

In-house counsel at mid-size B2B SaaS companies receive vendor contracts (MSAs, order forms, DPAs) and must quickly judge whether terms fall within B2B SaaS norms or skew aggressively against the customer. Today this is done by reading the contract end-to-end and pattern-matching against memory or a personal redline playbook. It is slow, inconsistent across reviewers, and creates a bottleneck when procurement volume spikes.

Specific verbatim request: 
>A customer (in-house counsel at a mid-size SaaS company) said this in a feedback call:
>"When I'm reviewing a vendor contract, I want to know if what they're giving me is reasonable or if they're trying to sneak in aggressive terms. I don't have time to benchmark against every contract I've seen. I wish I could just know how this compares to what's normal."
>Build something that addresses this need. That's it. That's the spec.

## 2. Solution (prototype)

A web app where counsel uploads a vendor contract (DOCX) and receives, within ~30 seconds, a structured report flagging each in-scope term as **Standard / Aggressive / Favorable / Not Found**, with the supporting clause text quoted and a one-sentence rationale.

This is a **read-only assessment tool** — no redlines, no negotiation language, no contract editing.

## 3. Goals & Non-goals

### Goals
- Demonstrate end-to-end value in a live demo: upload → parse → assess → readable report.
- Cover **8 high-signal contract terms** that in-house SaaS counsel review on every vendor contract.
- Architect the LLM layer behind a **provider-swappable interface** so future providers (Claude, OpenAI, others) can be added without touching business logic. The prototype ships **one concrete implementation: DeepSeek**.
- Keep total scope buildable in 5–8 hours by one engineer.

### Non-goals (prototype)
- Authentication, accounts, multi-tenancy.
- Persistence — no database, no upload history. Stateless request → response.
- PDF, scanned/OCR documents, Word `.doc` (legacy binary). DOCX only.
- Redlines or proposed alternative language.
- Clause-by-clause negotiation guidance, jurisdictional analysis, or governing-law assessment.
- Integrations (CLM, DocuSign, iManage, NetDocuments, Slack).
- Confidence calibration / model evaluation harness (track as fast-follow).

## 4. Target User & Use Case

**Primary persona:** In-house counsel at a 200–2,000 employee B2B SaaS company. Reviews 5–20 vendor contracts/month. Has a personal mental playbook but no formal redline library. Time-pressured by procurement and engineering stakeholders.

**Primary use case:** Counsel receives a vendor's draft MSA, drops the DOCX into the tool, and gets a one-page triage report indicating which terms warrant the most negotiation attention before they read the contract themselves.

**Out-of-persona (for now):** Outside counsel, procurement-led teams without legal review, contract-ops platforms.

## 5. User Flow

1. User lands on a single-page web app.
2. User drag-drops or selects a `.docx` file (max 10 MB).
3. App shows a progress indicator while the contract is parsed and assessed.
4. Results page renders the assessment report (see §7).
5. User can download the report as JSON (stretch: as PDF/markdown).
6. No history; refreshing the page or closing the tab discards the result.

## 6. Functional Requirements

### 6.1 Document ingestion
- Accept `.docx` files up to 10 MB.
- Extract plain text preserving paragraph and heading structure (used to help the LLM locate clauses).
- Reject non-DOCX uploads with a clear error.
- Strip tracked-changes markup; accept the "current" version of the text.

### 6.2 Term assessment (the 8 in scope)
For each of the 8 terms below, the system must produce:
- **Verdict:** `Standard | Aggressive | Favorable | Not Found`
- **Quoted clause:** exact text excerpt from the contract (≤ ~400 chars per quote; truncated mid-clause is acceptable).
- **Rationale:** one sentence explaining the verdict against the rubric.
- **Section reference:** the contract's section heading or number, if discoverable.

The 8 terms:
1. Liability cap
2. Indemnification
3. Data ownership
4. IP assignment
5. Exclusivity
6. Unlimited liability carve-outs (super-cap exclusions)
7. Warranty and disclaimers
8. Non-compete / non-solicit

See §8 for the per-term rubric the LLM is given.

### 6.3 Output report
- Top of page: file name, overall summary count (`X aggressive, Y standard, Z favorable, N not found`).
- Per-term card: verdict badge, quoted clause, rationale, section ref.
- **"Not Found" terms are rendered according to their `notFoundInterpretation` (defined per-term in §8.1)**, not uniformly de-emphasized:
  - `red_flag` → warning treatment (e.g., missing indemnity is a real gap counsel must catch).
  - `neutral` → muted treatment (absence is the norm; e.g., no exclusivity clause).
  - `favorable` → positive treatment (the absence of a typically-customer-unfriendly term).
  - `manual_review` → info treatment with a "verify" prompt (absence is unusual enough to suspect a parse miss).
- Disclaimer banner: *"This is an automated triage tool. Not legal advice. Verify all findings against the source contract."*

### 6.4 LLM provider abstraction
- A single `LLMProvider` interface with one method: `assess(contractText, rubric) → AssessmentResult`.
- **Prototype ships one concrete implementation: `DeepSeekProvider`.** Additional implementations (`AnthropicProvider`, `OpenAIProvider`) are deferred — the interface is the swap point; new providers can be added later without touching the upload, parsing, or report-rendering paths.
- Provider and model are parameterized via env vars (`LLM_PROVIDER`, `LLM_MODEL`) so when a second implementation lands, swapping requires no code change.
- **SDK choice for DeepSeek:** DeepSeek does not publish a first-party SDK. Their own docs prescribe using the OpenAI SDK pointed at `https://api.deepseek.com` with the DeepSeek API key. The prototype follows that path — `openai` npm package configured with DeepSeek's `baseURL`. (Vercel's `@ai-sdk/deepseek` is a viable alternative but pulls in the AI SDK as a dependency without meaningful benefit at this scope.)

## 7. Report Format (illustrative)

```
Contract: Acme MSA v3.2.docx
Summary: 3 Aggressive · 4 Standard · 0 Favorable · 1 Not Found

[AGGRESSIVE] Liability cap                                 §11.2
"Vendor's total liability shall not exceed three (3) months
of fees paid in the twelve months preceding the claim."
→ Cap is 3 months fees; B2B SaaS norm is 12 months trailing fees.

[STANDARD] Indemnification                                 §12.1
"Vendor shall defend and indemnify Customer from third-party
claims that the Service infringes any U.S. patent..."
→ Mutual indemnity with vendor IP indemnity; standard scope.

[NOT FOUND] Non-compete
→ No exclusivity, non-compete, or non-solicit clause detected.
   Typically expected to be absent in vendor SaaS — neutral signal.
```

## 8. Assessment Rubric (B2B SaaS norms)

This rubric is the single most important artifact for prototype quality. It is passed to the LLM as part of the system prompt.

### 8.1 Per-term metadata (drives "Not Found" handling)

Each term carries two static metadata fields used by the renderer when the LLM returns `Not Found`. These are baked into the rubric — the LLM is *not* asked to determine them; it only reports whether the clause is present.

```ts
type ExpectedPresence = "expected" | "usually_absent" | "optional";
type NotFoundInterpretation = "red_flag" | "neutral" | "favorable" | "manual_review";
```

| Term | expectedPresence | notFoundInterpretation | Reasoning |
|---|---|---|---|
| **Liability cap** | `expected` | `manual_review` | Every modern MSA has one; absence almost certainly indicates a parse miss, not an uncapped vendor. |
| **Indemnification** | `expected` | `red_flag` | Missing vendor IP indemnity is a real gap counsel must catch. |
| **Data ownership** | `expected` | `red_flag` | Silence on data ownership defaults to ambiguous IP rules — bad for customer. |
| **IP assignment** | `expected` | `red_flag` | Silence creates ambiguity over feedback, derivatives, and work product. |
| **Exclusivity** | `usually_absent` | `neutral` | Absence is the norm in vendor SaaS; nothing to flag. |
| **Unlimited liability carve-outs** | `expected` | `red_flag` | A liability cap with no carve-outs effectively caps vendor liability for confidentiality/IP/indemnity — major exposure. |
| **Warranty & disclaimers** | `expected` | `manual_review` | Universal in MSAs; absence likely indicates a parse miss. |
| **Non-compete / non-solicit** | `usually_absent` | `neutral` | Absence is the norm in vendor SaaS. |

### 8.2 Verdict rubric

| Term | Aggressive (red flag) | Standard (B2B SaaS norm) | Favorable (customer-friendly) |
|---|---|---|---|
| **Liability cap** | Cap < 6 months fees; one-way cap protecting only vendor; hard cap covers all damages with no carve-outs. | 12 months trailing fees; mutual; standard carve-outs (see row 6). | Super-cap (2–3x fees) for confidentiality/IP/data breach; or uncapped for those categories. |
| **Indemnification** | One-way (customer indemnifies vendor only); no vendor IP indemnity; indemnity capped at or below the general liability cap. | Mutual; vendor IP indemnity for 3rd-party infringement claims; customer indemnifies for misuse; indemnity carve-out from cap or super-cap. | Vendor "defend and indemnify" obligation; uncapped indemnity; broad scope incl. data/privacy claims. |
| **Data ownership** | Vendor claims ownership or broad rights to customer data beyond service provision; retention after termination; rights to use for product improvement without opt-out. | Customer owns customer data; vendor has narrow license to host/process for service delivery; deletion or export on termination. | Customer ownership + export rights + deletion within 30 days + no aggregated/anonymized use without consent. |
| **IP assignment** | Vendor claims ownership of feedback, derivative works, or anything "incorporating" customer input; broad license back from customer. | Each party retains pre-existing IP; vendor owns service IP and improvements; non-exclusive royalty-free license to feedback. | Customer retains feedback IP, or shared; clear delineation of work product; no implicit license to customer IP. |
| **Exclusivity** | Customer barred from using competing vendors during term or post-term; broad category exclusivity. | Silent / no exclusivity (the norm in vendor SaaS). | Explicit non-exclusivity clause. |
| **Unlimited liability carve-outs** | Carve-outs absent or extremely narrow (e.g., only gross negligence/willful misconduct). | Carve-outs for: confidentiality breach, IP infringement, indemnity obligations, gross negligence/willful misconduct. | Adds: data breach, regulatory violations, fraud, payment obligations. |
| **Warranty & disclaimers** | "AS IS" with full disclaimer of all warranties; no service-level commitment; no warranty of non-infringement. | Limited warranty of conformance to docs (e.g., 30–90 days); disclaimer of implied warranties; SLA referenced in separate exhibit. | Ongoing warranty of material conformance; uptime SLA with service credits; warranty of non-infringement. |
| **Non-compete / non-solicit** | Customer prohibited from engaging similar vendors; broad employee non-solicit binding customer. | No non-compete; mutual narrow non-solicit limited to direct project staff (if present at all). | None present, or non-solicit with general-hiring carve-out. |

The LLM prompt instructs the model to:
1. Locate the relevant clause(s) for each term, or report "Not Found" if absent.
2. Quote the clause verbatim.
3. Compare against the rubric row.
4. Output the four-field result (verdict, quote, rationale, section).

## 9. Architecture

### 9.1 Recommended stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Single repo; server actions handle upload + LLM call; deploys to Vercel in minutes. |
| UI | Tailwind + shadcn/ui | Demo-quality look-and-feel without bespoke CSS. |
| DOCX parsing | `mammoth` (npm) | Server-side DOCX → text/HTML. Mature, no native deps. |
| LLM SDK | `openai` package, configured with DeepSeek's `baseURL` | DeepSeek has no first-party SDK; their docs recommend the OpenAI SDK against their API. One dependency, zero abstraction overhead. |
| Validation | `zod` | Validate LLM JSON output; retry once on schema failure. |
| Hosting | Vercel (or `next start` locally for demo) | Zero-ops for prototype. |

### 9.2 Request lifecycle

```
Browser ──upload──▶ Next.js server action
                       │
                       ├─ mammoth.extractRawText(buffer)
                       │
                       ├─ LLMProvider.assess(text, rubric)
                       │     └─ JSON-mode call; zod-validate; retry once
                       │
                       └─ return AssessmentResult ─▶ Browser renders report
```

### 9.3 LLM call shape

- **Model default:** `deepseek-chat` (DeepSeek V3 or V3.1).
- **Mode:** JSON output, single call per contract (the 8 terms fit comfortably in one prompt for typical MSAs ≤ 30 pages).
- **Prompt structure:**
  - System: role + the rubric table from §8.
  - User: contract text (truncated at ~60k tokens to stay safely within DeepSeek's 64k context; truncation is acceptable for the prototype with a clear UI warning).
  - Output schema: array of 8 objects, one per term, in fixed order.
- **Long contracts (stretch):** if text exceeds the budget, fall back to per-term retrieval (keyword-anchored windowing) — out of scope for v0 unless time permits.

### 9.4 Provider interface (sketch)

```ts
interface LLMProvider {
  assess(contractText: string, rubric: Rubric): Promise<AssessmentResult>;
}

// Prototype ships ONE implementation:
class DeepSeekProvider implements LLMProvider {
  // Uses the `openai` SDK with baseURL = "https://api.deepseek.com"
  // and apiKey = process.env.DEEPSEEK_API_KEY
}

// Selected at startup via env: LLM_PROVIDER (default "deepseek"), LLM_MODEL (default "deepseek-chat")
// Future Anthropic/OpenAI implementations slot into the same interface — out of scope for v0.
```

## 10. Time Budget (5–8 hours)

| Block | Hours | Output |
|---|---|---|
| Project scaffold (Next.js, Tailwind, shadcn, env wiring) | 0.5 | Running app skeleton. |
| DOCX upload UI + server action + `mammoth` parse | 1.0 | Upload returns extracted text. |
| Rubric authoring + LLM prompt + JSON schema | 1.5 | Prompt produces valid output on 2–3 sample MSAs. |
| `LLMProvider` interface + DeepSeek implementation | 0.5 | DeepSeek call returns a valid AssessmentResult; interface is the swap point for future providers. |
| Results page UI (per-term cards, summary, disclaimer) | 1.5 | Demo-ready report rendering. |
| Manual QA on 3 real-ish sample MSAs + prompt tuning | 1.0 | Verdicts qualitatively correct. |
| Buffer / polish / minor bugs | 0.5–1.5 | — |
| **Total** | **5.5–7.5** | |

Items cut if running long: stretch report formats (PDF/markdown export), chunked long-contract handling, per-term confidence scores.

## 11. Success Criteria

The prototype demo succeeds if, on three representative vendor MSAs:
1. All 8 terms are correctly classified (within reviewer agreement) on at least 2 of 3 contracts.
2. Quoted clause text in the report appears verbatim in the source contract (no hallucinated quotes).
3. Total round-trip time < 45 seconds per contract on DeepSeek.
4. The `LLMProvider` interface is clean enough that a second implementation (e.g., Claude) could be added later without touching the upload, parsing, prompt-assembly, or report-rendering paths. (No second implementation is built in v0.)

## 12. Risks & Open Questions

### Risks
- **Hallucinated quotes.** Single biggest credibility risk. Mitigation: post-process — verify each `quoted_clause` substring exists in the source text; if not, mark the term `Verification Failed` rather than displaying.
- **DOCX parser quirks** with complex tables, headers/footers, footnotes. Mitigation: test on 3 real MSAs early; fall back to `mammoth.convertToHtml` then strip.
- **Context limits on long MSAs.** Mitigation: truncate with a UI warning for v0; chunk in v1.
- **Rubric subjectivity.** "Standard" varies by industry sub-segment. Mitigation: surface the rationale prominently so counsel can override with one glance.

### Open questions
- Do we want per-term **severity weighting** in the summary (e.g., weighted "deal-risk score") or stay with raw counts? Recommend stay raw for v0 — weighting requires calibration.
- Sample contract corpus for QA — do we have 3 MSAs to test against, or do we need to source/synthesize?

## 13. Out of Scope (explicit, for the next iteration)

- Auth, multi-tenancy, persistent reports.
- PDF and scanned/OCR ingestion.
- Redline generation.
- Clause-level retrieval for very long contracts (>60k tokens).
- Eval harness with labeled contracts.
- Customer-specific playbooks ("our company always pushes for super-cap on data breach").
- CLM/DocuSign integrations.
- **Additional LLM providers** beyond DeepSeek (Anthropic, OpenAI, others). Interface exists so they can be added later, but no concrete implementation ships in v0.
