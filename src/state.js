export const state = {
  fragmentsSurfaced: new Set(),
  currentTier: null,
  audioMuted: false,
  voiceEnabled: true,
};

export function resetState() {
  state.fragmentsSurfaced = new Set();
  state.currentTier = null;
  state.audioMuted = false;
  state.voiceEnabled = true;
}
