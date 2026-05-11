// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerdictBadge } from "./verdict-badge";
import type { NotFoundInterpretation } from "@/types/assessment";

describe("VerdictBadge", () => {
  it("renders Aggressive label", () => {
    render(<VerdictBadge verdict="Aggressive" notFoundInterpretation="neutral" />);
    expect(screen.getByText("Aggressive")).toBeInTheDocument();
  });

  it("renders Standard label", () => {
    render(<VerdictBadge verdict="Standard" notFoundInterpretation="neutral" />);
    expect(screen.getByText("Standard")).toBeInTheDocument();
  });

  it("renders Favorable label", () => {
    render(<VerdictBadge verdict="Favorable" notFoundInterpretation="neutral" />);
    expect(screen.getByText("Favorable")).toBeInTheDocument();
  });

  it("renders Verification Failed label, ignoring notFoundInterpretation", () => {
    render(
      <VerdictBadge
        verdict="Verification Failed"
        notFoundInterpretation="red_flag"
      />,
    );
    expect(screen.getByText("Verification Failed")).toBeInTheDocument();
  });

  it("renders distinct labels across all four notFoundInterpretation variants", () => {
    const cases: Array<{ interp: NotFoundInterpretation; label: string }> = [
      { interp: "red_flag", label: "Not Found — Red Flag" },
      { interp: "neutral", label: "Not Found" },
      { interp: "favorable", label: "Not Found — Favorable" },
      { interp: "manual_review", label: "Not Found — Verify" },
    ];
    for (const { interp, label } of cases) {
      const { unmount } = render(
        <VerdictBadge verdict="Not Found" notFoundInterpretation={interp} />,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("produces a different label for Aggressive vs Not Found / red_flag", () => {
    const { unmount: u1 } = render(
      <VerdictBadge verdict="Aggressive" notFoundInterpretation="neutral" />,
    );
    expect(screen.queryByText("Aggressive")).toBeInTheDocument();
    expect(screen.queryByText("Not Found — Red Flag")).not.toBeInTheDocument();
    u1();
    render(<VerdictBadge verdict="Not Found" notFoundInterpretation="red_flag" />);
    expect(screen.getByText("Not Found — Red Flag")).toBeInTheDocument();
    expect(screen.queryByText("Aggressive")).not.toBeInTheDocument();
  });

  it("emits the underlying Badge slot", () => {
    const { container } = render(
      <VerdictBadge verdict="Standard" notFoundInterpretation="neutral" />,
    );
    expect(container.querySelector("[data-slot='badge']")).not.toBeNull();
  });
});
