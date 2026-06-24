const LANTERN_WORLD_RADIUS = 140;
let nearHidden = false;

export function setupLantern(seeker, tierConfig) {
  const overlay = document.getElementById("lantern-overlay");
  const darkness = 1 - tierConfig.light;

  if (darkness <= 0.05) {
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "block";
  const baseRadius = 90 + tierConfig.light * 60;

  seeker.onUpdate(() => {
    nearHidden = false;
    for (const marker of get("hidden-marker", { recursive: true })) {
      const dist = seeker.pos.dist(marker.pos);
      if (dist < LANTERN_WORLD_RADIUS) {
        marker.opacity = Math.max(0, 1 - dist / LANTERN_WORLD_RADIUS);
        if (marker.opacity > 0.3) nearHidden = true;
      } else {
        marker.opacity = 0;
      }
    }

    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const breatheSpeed = nearHidden ? 5 : 2;
    const radius = baseRadius + Math.sin(time() * breatheSpeed) * 10;
    overlay.style.background = `radial-gradient(circle ${radius}px at ${cx}px ${cy}px, transparent 0%, transparent 60%, rgba(10,8,14,${darkness}) 100%)`;
  });
}
