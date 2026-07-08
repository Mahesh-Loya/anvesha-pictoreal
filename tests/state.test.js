import { describe, it, expect } from "vitest";
import { state, resetState } from "../src/state.js";

describe("state", () => {
  it("starts with no fragments surfaced, no tier, audio unmuted", () => {
    resetState();
    expect(state.fragmentsSurfaced.size).toBe(0);
    expect(state.currentTier).toBeNull();
    expect(state.audioMuted).toBe(false);
  });

  it("resetState clears prior mutations", () => {
    resetState();
    state.fragmentsSurfaced.add("f01");
    state.currentTier = "surface";
    state.audioMuted = true;
    resetState();
    expect(state.fragmentsSurfaced.size).toBe(0);
    expect(state.currentTier).toBeNull();
    expect(state.audioMuted).toBe(false);
  });
});
