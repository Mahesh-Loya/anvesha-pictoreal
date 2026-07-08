import { describe, it, expect, beforeEach } from "vitest";
import { resetState } from "../src/state.js";
import {
  surfaceFragment,
  getSurfacedCount,
  getTotalFragments,
  isJourneyComplete,
} from "../src/systems/fragments.js";

describe("fragments system", () => {
  beforeEach(() => resetState());

  it("reports total fragments from config (8 pages across 4 sections)", () => {
    expect(getTotalFragments()).toBe(8);
  });

  it("surfacing a new fragment increases the count and is not already-surfaced", () => {
    const result = surfaceFragment("f01");
    expect(result.alreadySurfaced).toBe(false);
    expect(result.totalSurfaced).toBe(1);
    expect(getSurfacedCount()).toBe(1);
  });

  it("surfacing the same fragment twice does not double-count", () => {
    surfaceFragment("f01");
    const second = surfaceFragment("f01");
    expect(second.alreadySurfaced).toBe(true);
    expect(getSurfacedCount()).toBe(1);
  });

  it("isJourneyComplete is true only once all 8 fragments are surfaced", () => {
    ["f01", "f02", "f03", "f04", "f05", "f06", "f07"].forEach(surfaceFragment);
    expect(isJourneyComplete()).toBe(false);
    const last = surfaceFragment("f08");
    expect(last.isComplete).toBe(true);
    expect(isJourneyComplete()).toBe(true);
  });
});
