import mammoth from "mammoth";

// Mammoth's extractRawText already renders the "all changes accepted" view
// (w:ins kept inline, w:del ignored) — no manual tracked-changes stripping needed.
// Paragraphs are joined with "\n\n", tabs with "\t".
// TODO(m4-fallback): if structure loss (tables, auto-numbered sections) hurts
// rubric quality in M4, swap to mammoth.convertToHtml + a custom transformer.

export class ParseError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ParseError";
    this.cause = cause;
  }
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  let result: { value: string };
  try {
    result = await mammoth.extractRawText({ buffer });
  } catch (err) {
    throw new ParseError("Failed to parse DOCX", err);
  }

  const text = result.value.trim();
  if (text.length === 0) {
    throw new ParseError("DOCX contained no extractable text");
  }
  return text;
}
