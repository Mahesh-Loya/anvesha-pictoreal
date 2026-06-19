const INTERACT_RANGE = 40;

export function setupInteraction(seeker, onOpenPage) {
  onKeyPress("e", () => {
    // addLevel() spawns tiles as descendants of an intermediate level
    // container rather than direct children of root, so get() must be
    // recursive to find them.
    const markers = get("page-marker", { recursive: true });
    for (const marker of markers) {
      if (marker.is("hidden-marker") && marker.opacity < 0.5) continue;
      if (seeker.pos.dist(marker.pos) <= INTERACT_RANGE) {
        onOpenPage(marker.pageData);
        return;
      }
    }
  });
}
