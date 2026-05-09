import { describe, it, expect } from "vitest";

describe("backend toolchain", () => {
  it("runs under node", () => {
    expect(typeof process.versions.node).toBe("string");
  });
});
