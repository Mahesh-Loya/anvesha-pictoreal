import { magazine } from "../content/magazine.config.js";
import { state } from "../state.js";
import { buildLevel } from "../systems/level.js";
import { spawnSeeker } from "../entities/seeker.js";

export function registerTierScene() {
  scene("tier", (tierId) => {
    const tierConfig = magazine.tiers.find((t) => t.id === tierId);
    if (!tierConfig) {
      throw new Error(`Unknown tier id: ${tierId}`);
    }
    state.currentTier = tierId;

    add([
      rect(width() * 4, height() * 4),
      pos(-width(), -height()),
      color(...hexBg(tierConfig.palette.bg)),
    ]);

    const { seekerSpawn } = buildLevel(tierConfig);
    const seeker = spawnSeeker(seekerSpawn.x, seekerSpawn.y);

    seeker.onUpdate(() => {
      setCamPos(seeker.pos);
    });

    seeker.onCollide("stairs-down", () => {
      const nextTier = getNextTierId(tierId);
      if (nextTier) go("tier", nextTier);
      else go("ending");
    });

    seeker.onCollide("stairs-up", () => {
      const prevTier = getPrevTierId(tierId);
      if (prevTier) go("tier", prevTier);
    });
  });
}

function getNextTierId(currentId) {
  const idx = magazine.tiers.findIndex((t) => t.id === currentId);
  return magazine.tiers[idx + 1]?.id ?? null;
}

function getPrevTierId(currentId) {
  const idx = magazine.tiers.findIndex((t) => t.id === currentId);
  return magazine.tiers[idx - 1]?.id ?? null;
}

function hexBg(hex) {
  const clean = hex.replace("#", "");
  return [parseInt(clean.substring(0, 2), 16), parseInt(clean.substring(2, 4), 16), parseInt(clean.substring(4, 6), 16)];
}
