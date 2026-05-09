// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("frontend toolchain", () => {
  it("renders into jsdom with RTL + jest-dom matchers", () => {
    render(<h1>scaffold ok</h1>);
    expect(
      screen.getByRole("heading", { name: /scaffold ok/i }),
    ).toBeInTheDocument();
  });
});
