// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  DownloadJsonButton,
  downloadName,
} from "./download-json-button";
import type { AssessmentResult } from "@/types/assessment";

const sampleResult: AssessmentResult = {
  filename: "acme-msa.docx",
  summary: {
    aggressive: 1,
    standard: 6,
    favorable: 0,
    notFound: 1,
    verificationFailed: 0,
  },
  terms: [
    {
      termId: "liability_cap",
      verdict: "Aggressive",
      quotedClause: "Cap at 3 months fees",
      rationale: "Below B2B SaaS norm",
      sectionRef: "§11.2",
    },
  ],
  truncated: false,
};

describe("downloadName", () => {
  it("replaces .docx with .assessment.json", () => {
    expect(downloadName("foo.docx")).toBe("foo.assessment.json");
  });

  it("is case-insensitive on the .docx suffix", () => {
    expect(downloadName("FOO.DOCX")).toBe("FOO.assessment.json");
  });

  it("falls back to assessment.json when there is no extension", () => {
    expect(downloadName("bar")).toBe("assessment.json");
  });

  it("falls back to assessment.json when the extension is not .docx", () => {
    expect(downloadName("x.pdf")).toBe("assessment.json");
  });
});

describe("DownloadJsonButton", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let capturedBlob: Blob | null;

  beforeEach(() => {
    capturedBlob = null;
    createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock";
    });
    revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders a single Download JSON button", () => {
    render(<DownloadJsonButton result={sampleResult} />);
    expect(screen.getByRole("button", { name: /download json/i })).toBeInTheDocument();
  });

  it("creates a JSON blob, triggers the anchor click, then revokes the URL", async () => {
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createdAnchors: HTMLAnchorElement[] = [];
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName) as HTMLElement;
        if (tagName === "a") {
          (el as HTMLAnchorElement).click = clickSpy;
          createdAnchors.push(el as HTMLAnchorElement);
        }
        return el as ReturnType<typeof document.createElement>;
      });

    render(<DownloadJsonButton result={sampleResult} />);
    fireEvent.click(screen.getByRole("button", { name: /download json/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(capturedBlob).not.toBeNull();
    const blob = capturedBlob as Blob;
    expect(blob.type).toBe("application/json");
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(text).toBe(JSON.stringify(sampleResult, null, 2));

    expect(createdAnchors).toHaveLength(1);
    const anchor = createdAnchors[0];
    expect(anchor.getAttribute("download")).toBe("acme-msa.assessment.json");
    expect(anchor.getAttribute("href")).toBe("blob:mock");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(document.body.contains(anchor)).toBe(false);

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    createElementSpy.mockRestore();
  });
});
