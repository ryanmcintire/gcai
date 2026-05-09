"use server";

import { parseDocx, ParseError } from "@/lib/parse";

const MAX_BYTES = 10 * 1024 * 1024;
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type AssessResult =
  | { ok: true; filename: string; text: string }
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
    return { ok: true, filename: file.name, text };
  } catch (err) {
    if (err instanceof ParseError) {
      return { ok: false, error: err.message };
    }
    console.error("assessContract failed", err);
    return {
      ok: false,
      error: "Could not read this DOCX. Please try a different file.",
    };
  }
}
