"use server";

import { parseDocx, ParseError } from "@/lib/parse";
import { getProvider, LLMProviderError } from "@/lib/llm";
import { verifyQuotes } from "@/lib/llm/verify-quotes";
import { rubric } from "@/lib/rubric";
import { assessmentResultSchema } from "@/lib/schema";
import type { AssessmentResult } from "@/types/assessment";

const MAX_BYTES = 10 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type AssessResult =
  | { ok: true; result: AssessmentResult }
  | { ok: false; error: string };

export async function assessContract(
  formData: FormData,
): Promise<AssessResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided" };
  }
  if (file.size === 0) {
    return { ok: false, error: "File is empty" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File exceeds 10 MB limit" };
  }
  // Browsers don't reliably set MIME for .docx (Safari often empty,
  // Windows Office sometimes octet-stream) — accept either.
  const looksLikeDocx =
    file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx");
  if (!looksLikeDocx) {
    return { ok: false, error: "Only .docx files are supported" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseDocx(buffer);
    const provider = getProvider();
    const providerResult = await provider.assess(text, rubric);
    const verified = verifyQuotes(providerResult, text);
    const result: AssessmentResult = { filename: file.name, ...verified };
    const validated = assessmentResultSchema.safeParse(result);
    if (!validated.success) {
      console.error("assessContract: final schema validation failed", validated.error.issues);
      return {
        ok: false,
        error: "Assessment output failed validation. Please try again.",
      };
    }
    return { ok: true, result };
  } catch (err) {
    if (err instanceof ParseError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof LLMProviderError) {
      return { ok: false, error: err.message };
    }
    console.error("assessContract failed", err);
    return {
      ok: false,
      error: "Could not complete the assessment. Please try again.",
    };
  }
}
