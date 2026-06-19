import { magazine } from "../content/magazine.config.js";
import { state } from "../state.js";
import { buildLevel } from "../systems/level.js";
import { spawnSeeker } from "../entities/seeker.js";
import { spawnNpc } from "../entities/npc.js";
import { openDialogue, advanceDialogue, closeDialogue, isDialogueOpen } from "../ui/dialogue.js";
import { hexToRgb } from "../systems/color.js";
import { setupInteraction } from "../systems/interaction.js";

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
      color(...hexToRgb(tierConfig.palette.bg)),
    ]);

    const { seekerSpawn, npcSpawn } = buildLevel(tierConfig);
    if (!seekerSpawn) {
      throw new Error(`Tier "${tierId}" map has no "S" Seeker spawn tile`);
    }
    const seeker = spawnSeeker(seekerSpawn.x, seekerSpawn.y);

    const npc = npcSpawn ? spawnNpc(npcSpawn.x, npcSpawn.y) : null;

    onKeyPress("e", () => {
      if (isDialogueOpen()) {
        advanceDialogue();
        return;
      }
      if (npc && npc.isSeekerInRange()) {
        openDialogue(tierConfig.npc.lines);
      }
    });

    onKeyPress("escape", () => {
      if (isDialogueOpen()) closeDialogue();
    });

    setupInteraction(seeker, (pageData) => {
      console.log("Opening page:", pageData.title);
    });

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
