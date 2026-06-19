import { describe, it, expect } from "vitest";
import { validateConfig } from "../src/content/validate-config.js";

describe("validateConfig", () => {
  it("passes when fragments.rows * cols equals total page count", () => {
    const cfg = {
      fragments: { rows: 1, cols: 2 },
      tiers: [{ pages: [{ id: "a" }] }, { pages: [{ id: "b" }] }],
    };
    const result = validateConfig(cfg);
    expect(result.valid).toBe(true);
    expect(result.totalPages).toBe(2);
    expect(result.errors).toEqual([]);
  });

  it("fails when fragments.rows * cols does not match total page count", () => {
    const cfg = {
      fragments: { rows: 1, cols: 5 },
      tiers: [{ pages: [{ id: "a" }] }],
    };
    const result = validateConfig(cfg);
    expect(result.valid).toBe(false);
    expect(result.totalPages).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
