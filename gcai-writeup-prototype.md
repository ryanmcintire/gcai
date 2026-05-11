# **GC.AI Project Prototype**

## **How I Interpreted the Problem**

I interpreted the problem as in-house counsel dealing with a specific bottleneck: the lack of a rapid and reliable way to assess whether a proposed vendor contract contains "aggressive" terms. I interpret the problem as a bottleneck problem and awareness problem, where mid-size general counsel lacks both the time to fully process all vendor contracts assiduously for aggressive terms and lacks capability to be fully aware of how contractual terms may be "aggressive". I interpret a concern about "aggressive" provisions to be a concern about whether contractual terms are drafted in a manner to be outside of standard market practice or drafted in a way that may be unfavorable to the customer in-house counsel without realizing what they are giving away if accepting the terms. This led to the follow-on product problem: Can I build an LLM-based prototype to triage contracts for potential aggressive terms?

## **Key Product Decisions and Why**

**Single-call LLM pipeline.** I sent the full contract text with structured benchmarking instructions in one API call rather than building a multi-step extraction pipeline. This hits context limits on longer contracts and gives less granular control over clause identification. But for a prototype, the engineering simplicity matters more than best-in-class frontier model.

**DeepSeek API for the LLM layer.** I picked DeepSeek for its quality-to-cost ratio. I put the LLM invocation behind an interface abstraction so the model is swappable. 

**Structured JSON output over free-text analysis.** The model returns a typed assessment per clause: classification, confidence indicator, and brief explanation. A clause-by-clause breakdown allows consistent shape to work with UI and supports testing. Free-text analysis would either require a second parsing pass or force the user to read through an unstructured blob.

**Next.js with React frontend.** Server-side API routes with minimal setup, fast iteration, and broad SDK support for LLM providers and DOCX parsing. Standard prototype stack for an app with an LLM API integration at its core.

**DOCX-only for file input.** Attorneys doing active contract work (redlines, negotiations, internal review) are working in Word. DOCX is the native format for that workflow. It's also much easier to extract clean text from than PDF.

**Key provision focus.** I focused on 8 common provisions in standard mid-tier MSAs for SaaS vendors. These struck me as ideal candidates for proof of concept since MSA format is commonly addressed in mid-tier SaaS context, and the 8 selected provisions are ones where aggressive terms most commonly apply. 

## **What I Would Do Differently with More Time**

The biggest gap is benchmark grounding. Right now the system leans entirely on the model's training data for what "standard" B2B SaaS terms look like. It also relies on a global notion of "aggressive" rather than something tailored for particular contracts or business contexts.

Other things I'd invest in, roughly in priority order: breaking clause extraction into its own pipeline step so each clause gets analyzed individually rather than as part of a full-document pass (I'd run initial tests to validate if per-clause extraction yields meaningfully different results); systematic prompt variation testing across different contract types to find where the prompt breaks; expansion to additional clauses; automated regression tests to catch output quality drift when the underlying model gets updated; an agentic review layer where a second LLM pass challenges the initial assessment to reduce overconfident misclassifications; and alternate format parsing. I would also develop common SaaS features such as authentication, persistent file storage, assessment history, and more.

## **What I Am Most and Least Confident About**

**Most confident:** The interaction model fits how the target user already works. A user uploads a and gets a rapid assessment of key provisions where the user is likely to face aggressive provisions. I'm also confident the interface abstraction on the LLM layer was the right call. The model landscape is moving fast and being locked to one provider would be a liability.

**Least confident:** Whether the model's notion of "normal" is reliable enough to be useful. Common provisions like mutual indemnification or standard liability caps are probably well-represented in training data. Unusual provisions, heavily negotiated terms, or industry-specific language are where I worry. The model might flag something as "aggressive" when it's really just uncommon, or worse, miss genuinely problematic terms because they're drafted in facially neutral language. A confidently wrong assessment is worse than no assessment at all, because in-house counsel may anchor on it without verifying. This may potentially be mitigated by a more robust corpus of contracts and provisions with a per-clause evaluation and RAG lookup.

I also have open questions about evaluation quality on longer and more structurally complex contracts, where the model's attention is spread thinner, and about cost and latency scaling as contract length and user volume increase. All of these are testable.