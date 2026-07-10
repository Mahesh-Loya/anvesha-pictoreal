import { describe, it, expect, beforeEach } from "vitest";
import { resetState } from "../src/state.js";
import { magazine } from "../src/content/magazine.config.js";
import {
  surfaceFragment,
  getSurfacedCount,
  getTotalFragments,
  isJourneyComplete,
} from "../src/systems/fragments.js";

const allFragmentIds = magazine.tiers.flatMap((t) => t.pages.map((p) => p.fragmentId));

describe("fragments system", () => {
  beforeEach(() => resetState());

  it("reports total fragments from config (sum of every section's pages)", () => {
    expect(getTotalFragments()).toBe(allFragmentIds.length);
    expect(getTotalFragments()).toBeGreaterThan(0);
  });

  it("surfacing a new fragment increases the count and is not already-surfaced", () => {
    const result = surfaceFragment(allFragmentIds[0]);
    expect(result.alreadySurfaced).toBe(false);
    expect(result.totalSurfaced).toBe(1);
    expect(getSurfacedCount()).toBe(1);
  });

  it("surfacing the same fragment twice does not double-count", () => {
    surfaceFragment(allFragmentIds[0]);
    const second = surfaceFragment(allFragmentIds[0]);
    expect(second.alreadySurfaced).toBe(true);
    expect(getSurfacedCount()).toBe(1);
  });

  it("isJourneyComplete is true only once every fragment is surfaced", () => {
    allFragmentIds.slice(0, -1).forEach(surfaceFragment);
    expect(isJourneyComplete()).toBe(false);
    const last = surfaceFragment(allFragmentIds[allFragmentIds.length - 1]);
    expect(last.isComplete).toBe(true);
    expect(isJourneyComplete()).toBe(true);
  });
});
