// True when a modal overlay is open. Player movement and node clicks are
// frozen while one is, so nothing happens underneath an open overlay.
const MODAL_IDS = ["reader-root", "journal-root", "dialogue-root", "narration-root", "contents-root"];

export function isAnyOverlayOpen() {
  return MODAL_IDS.some(
    (id) => document.getElementById(id)?.classList.contains("visible")
  );
}
