import { describe, expect, it } from "vitest";
import { sanitizeErrorText, sanitizeStack } from "../lib/rules/error-sanitizer";

describe("error sanitizer", () => {
  it("redacts common tokens", () => {
    const text = sanitizeErrorText("failed with ghp_abc123 and sbp_abcdef");
    expect(text).not.toContain("ghp_abc123");
    expect(text).not.toContain("sbp_abcdef");
    expect(text).toContain("[redacted]");
  });

  it("limits stack length", () => {
    const err = new Error("x".repeat(2000));
    expect(sanitizeStack(err, 100).length).toBeLessThanOrEqual(100);
  });
});
