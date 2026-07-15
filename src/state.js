export const state = {
  fragmentsSurfaced: new Set(),
  starsCollected: new Set(),
  currentTier: null,
  audioMuted: false,
  voiceEnabled: true,
};

// Persist the treasure-hunt progress (pages uncovered + stars collected) so the
// 154-page / 28-star journey survives reloads and return visits.
const LS_KEY = "pv28-progress";
export function saveProgress() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      fragments: [...state.fragmentsSurfaced],
      stars: [...state.starsCollected],
    }));
  } catch {}
}
function loadProgress() {
  try {
    const j = JSON.parse(localStorage.getItem(LS_KEY));
    if (j) {
      state.fragmentsSurfaced = new Set(j.fragments || []);
      state.starsCollected = new Set(j.stars || []);
    }
  } catch {}
}
if (typeof localStorage !== "undefined") loadProgress();

export function resetState() {
  state.fragmentsSurfaced = new Set();
  state.starsCollected = new Set();
  state.currentTier = null;
  state.audioMuted = false;
  state.voiceEnabled = true;
}
