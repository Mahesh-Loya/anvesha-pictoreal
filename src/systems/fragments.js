import { state, saveProgress } from "../state.js";
import { magazine } from "../content/magazine.config.js";

export function getTotalFragments() {
  return magazine.tiers.reduce((sum, tier) => sum + tier.pages.length, 0);
}

export function getSurfacedCount() {
  return state.fragmentsSurfaced.size;
}

export function isJourneyComplete() {
  return getSurfacedCount() >= getTotalFragments();
}

export function surfaceFragment(fragmentId) {
  const alreadySurfaced = state.fragmentsSurfaced.has(fragmentId);
  if (!alreadySurfaced) {
    state.fragmentsSurfaced.add(fragmentId);
    saveProgress();
  }
  return {
    alreadySurfaced,
    totalSurfaced: getSurfacedCount(),
    isComplete: isJourneyComplete(),
  };
}
