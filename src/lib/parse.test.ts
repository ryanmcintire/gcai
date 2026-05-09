import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { parseDocx, ParseError } from "./parse";

const fixturePath = join(__dirname, "__fixtures__", "sample.docx");

describe("parseDocx", () => {
  it("extracts text from a valid DOCX", async () => {
    const buf = readFileSync(fixturePath);
    const text = await parseDocx(buf);
    expect(text).toContain("Section 1");
    expect(text).toContain("This is the first paragraph of the sample contract.");
    expect(text).toContain("Final paragraph wraps up the test fixture.");
  });

  it("preserves paragraph breaks as double newlines", async () => {
    const buf = readFileSync(fixturePath);
    const text = await parseDocx(buf);
    expect(text).toMatch(/Section 1\n\nThis is the first paragraph/);
    expect(text).toMatch(/Section 2\n\nFinal paragraph/);
  });

  it("throws ParseError on an empty buffer", async () => {
    await expect(parseDocx(Buffer.alloc(0))).rejects.toBeInstanceOf(ParseError);
  });

  it("throws ParseError on non-DOCX bytes", async () => {
    await expect(parseDocx(Buffer.from("not a docx"))).rejects.toBeInstanceOf(
      ParseError,
    );
  });
});
