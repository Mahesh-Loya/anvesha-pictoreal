// True when a modal overlay (reader, journal, dialogue) is open. Player
// movement is frozen while one is, so the Seeker can't wander or trigger a
// scene transition underneath an open overlay.
const MODAL_IDS = ["reader-root", "journal-root", "dialogue-root"];

export function isAnyOverlayOpen() {
  return MODAL_IDS.some(
    (id) => document.getElementById(id)?.classList.contains("visible")
  );
}
