// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Report } from "./report";
import { rubric } from "@/lib/rubric";
import type {
  AssessmentResult,
  TermAssessment,
  TermId,
} from "@/types/assessment";

const TERM_IDS: readonly TermId[] = rubric.map((r) => r.id);

function buildTerm(termId: TermId, overrides: Partial<TermAssessment> = {}): TermAssessment {
  return {
    termId,
    verdict: "Standard",
    quotedClause: `Quoted clause for ${termId}.`,
    rationale: `Rationale for ${termId}.`,
    sectionRef: "§1.0",
    ...overrides,
  };
}

function buildResult(
  perTerm: Partial<Record<TermId, Partial<TermAssessment>>> = {},
  options: { filename?: string; truncated?: boolean } = {},
): AssessmentResult {
  const terms = TERM_IDS.map((id) => buildTerm(id, perTerm[id] ?? {}));
  const summary = {
    aggressive: 0,
    standard: 0,
    favorable: 0,
    notFound: 0,
    verificationFailed: 0,
  };
  for (const t of terms) {
    if (t.verdict === "Aggressive") summary.aggressive += 1;
    else if (t.verdict === "Standard") summary.standard += 1;
    else if (t.verdict === "Favorable") summary.favorable += 1;
    else if (t.verdict === "Not Found") summary.notFound += 1;
    else if (t.verdict === "Verification Failed") summary.verificationFailed += 1;
  }
  return {
    filename: options.filename ?? "test-msa.docx",
    summary,
    terms,
    truncated: options.truncated,
  };
}

describe("Report", () => {
  it("renders filename and summary line", () => {
    const result = buildResult({
      liability_cap: { verdict: "Aggressive" },
      indemnification: { verdict: "Favorable" },
      exclusivity: { verdict: "Not Found", quotedClause: "", sectionRef: null },
    });
    render(<Report result={result} />);
    expect(screen.getByText("test-msa.docx")).toBeInTheDocument();
    expect(
      screen.getByText(/1 Aggressive · 5 Standard · 1 Favorable · 1 Not Found/),
    ).toBeInTheDocument();
  });

  it("renders the PRD §6.3 disclaimer verbatim", () => {
    render(<Report result={buildResult()} />);
    expect(
      screen.getByText(
        /This is an automated triage tool\. Not legal advice\. Verify all findings against the source contract\./,
      ),
    ).toBeInTheDocument();
  });

  it("shows the truncation banner only when truncated === true", () => {
    const { rerender } = render(
      <Report result={buildResult({}, { truncated: false })} />,
    );
    expect(screen.queryByText(/truncated to fit/i)).not.toBeInTheDocument();
    rerender(<Report result={buildResult({}, { truncated: true })} />);
    expect(screen.getByText(/truncated to fit/i)).toBeInTheDocument();
  });

  it("renders the quoted clause for a Standard term", () => {
    const result = buildResult({
      liability_cap: {
        verdict: "Standard",
        quotedClause: "Vendor's total liability is capped at 12 months of fees.",
      },
    });
    render(<Report result={result} />);
    expect(
      screen.getByText(/Vendor's total liability is capped at 12 months of fees\./),
    ).toBeInTheDocument();
  });

  it("hides the quoted clause for a Not Found term", () => {
    const result = buildResult({
      exclusivity: {
        verdict: "Not Found",
        quotedClause: "",
        rationale: "No exclusivity clause detected.",
        sectionRef: null,
      },
    });
    render(<Report result={result} />);
    expect(screen.getByText("No exclusivity clause detected.")).toBeInTheDocument();
    // The empty clause string would render nothing; ensure no stray pre is empty-rendered with content.
    expect(screen.queryByText(/Quoted clause for exclusivity/)).not.toBeInTheDocument();
  });

  it("hides the quoted clause for a Verification Failed term and uses that badge", () => {
    const result = buildResult({
      data_ownership: {
        verdict: "Verification Failed",
        quotedClause: "",
        rationale: "Quoted clause could not be verified against the source contract.",
        sectionRef: null,
      },
    });
    render(<Report result={result} />);
    expect(screen.getByText("Verification Failed")).toBeInTheDocument();
    expect(
      screen.getByText(/Quoted clause could not be verified/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Quoted clause for data_ownership/)).not.toBeInTheDocument();
  });

  it("renders cards in PRD-fixed rubric order", () => {
    const { container } = render(<Report result={buildResult()} />);
    const ids = Array.from(
      container.querySelectorAll<HTMLElement>("[data-term-id]"),
    ).map((el) => el.getAttribute("data-term-id"));
    expect(ids).toEqual(rubric.map((r) => r.id));
  });

  it("renders a Download JSON button in the header", () => {
    render(<Report result={buildResult()} />);
    expect(
      screen.getByRole("button", { name: /download json/i }),
    ).toBeInTheDocument();
  });

  it("renders the all-verification-failed banner when every term is Verification Failed", () => {
    const allFailed = Object.fromEntries(
      TERM_IDS.map((id) => [
        id,
        {
          verdict: "Verification Failed" as const,
          quotedClause: "",
          rationale: "Quoted clause could not be verified against the source contract.",
          sectionRef: null,
        },
      ]),
    ) as Partial<Record<TermId, Partial<TermAssessment>>>;
    render(<Report result={buildResult(allFailed)} />);
    expect(
      screen.getByText(/None of the quoted clauses could be verified/i),
    ).toBeInTheDocument();
  });

  it("does not render the all-verification-failed banner when verdicts are mixed", () => {
    const result = buildResult({
      data_ownership: {
        verdict: "Verification Failed",
        quotedClause: "",
        rationale: "Quoted clause could not be verified against the source contract.",
        sectionRef: null,
      },
    });
    render(<Report result={result} />);
    expect(
      screen.queryByText(/None of the quoted clauses could be verified/i),
    ).not.toBeInTheDocument();
  });

  it("shows verificationFailed sub-line iff verificationFailed > 0", () => {
    const { rerender } = render(<Report result={buildResult()} />);
    expect(screen.queryByText(/could not be verified/i)).not.toBeInTheDocument();
    rerender(
      <Report
        result={buildResult({
          data_ownership: {
            verdict: "Verification Failed",
            quotedClause: "",
            rationale: "Quoted clause could not be verified against the source contract.",
            sectionRef: null,
          },
        })}
      />,
    );
    expect(screen.getByText(/1 could not be verified/i)).toBeInTheDocument();
  });
});
