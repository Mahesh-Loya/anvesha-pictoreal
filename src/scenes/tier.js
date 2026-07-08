import gsap from "gsap";
import { magazine } from "../content/magazine.config.js";
import { state } from "../state.js";
import { buildLevel } from "../systems/level.js";
import { spawnSutradhar } from "../entities/sutradhar.js";
import { setupAmbiance } from "../systems/ambiance.js";
import { spawnNpc } from "../entities/npc.js";
import { openDialogue, advanceDialogue, closeDialogue, isDialogueOpen } from "../ui/dialogue.js";
import { openReader, closeReader, isReaderOpen } from "../ui/reader.js";
import { hexToRgb } from "../systems/color.js";
import { setupInteraction } from "../systems/interaction.js";
import { surfaceFragment } from "../systems/fragments.js";
import { playFragmentChime } from "../systems/audio.js";
import { mountHud, updateHudCount, getHudJournalButtonRect } from "../ui/hud.js";
import { isJournalOpen, closeJournal } from "../ui/journal.js";
import { setupLantern } from "../systems/lantern.js";
import { playDescentTransition } from "../ui/transition.js";
import { playDescentRumble } from "../systems/audio.js";

export function registerTierScene() {
  scene("tier", (tierId) => {
    const tierConfig = magazine.tiers.find((t) => t.id === tierId);
    if (!tierConfig) {
      throw new Error(`Unknown tier id: ${tierId}`);
    }
    state.currentTier = tierId;
    let transitioning = false;

    add([
      rect(width() * 4, height() * 4),
      pos(-width(), -height()),
      color(...hexToRgb(tierConfig.palette.bg)),
      z(-100),
    ]);

    const { seekerSpawn, npcSpawn } = buildLevel(tierConfig);
    if (!seekerSpawn) {
      throw new Error(`Tier "${tierId}" map has no "S" Seeker spawn tile`);
    }
    const seeker = spawnSutradhar(seekerSpawn.x, seekerSpawn.y);

    const npc = npcSpawn ? spawnNpc(npcSpawn.x, npcSpawn.y) : null;

    setupAmbiance(seeker, tierConfig);
    setupLantern(seeker, tierConfig);

    mountHud();

    onKeyPress("e", () => {
      if (isDialogueOpen()) {
        advanceDialogue();
        return;
      }
      if (npc && npc.isSeekerInRange()) {
        openDialogue(tierConfig.npc.lines);
      }
    });

    setupInteraction(seeker, (pageData) => {
      openReader(pageData, () => {
        surfaceFragment(pageData.fragmentId);
        playFragmentChime();
        flyFragmentToJournal();
        updateHudCount();
      });
    });

    // One Escape handler closes whichever overlay is on top.
    onKeyPress("escape", () => {
      if (isReaderOpen()) {
        closeReader();
        return;
      }
      if (isJournalOpen()) {
        closeJournal();
        return;
      }
      if (isDialogueOpen()) closeDialogue();
    });

    // Smooth camera follow (gentle lerp toward the Sutradhar).
    setCamPos(seeker.pos);
    seeker.onUpdate(() => {
      setCamPos(getCamPos().lerp(seeker.pos, 0.12));
    });

    seeker.onCollide("stairs-down", () => {
      if (transitioning) return;
      transitioning = true;
      playDescentRumble();
      playDescentTransition(() => {
        const nextTier = getNextTierId(tierId);
        if (nextTier) go("tier", nextTier);
        else go("ending");
      });
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

function flyFragmentToJournal() {
  const flightRoot = document.getElementById("fragment-flight-root");
  const start = document.querySelector(".reader-card")?.getBoundingClientRect();
  const end = getHudJournalButtonRect();
  if (!start) return;

  const dot = document.createElement("div");
  dot.className = "flying-fragment";
  dot.style.left = `${start.left + start.width / 2}px`;
  dot.style.top = `${start.top + start.height / 2}px`;
  flightRoot.appendChild(dot);

  gsap.to(dot, {
    left: end.left + end.width / 2,
    top: end.top + end.height / 2,
    duration: 0.9,
    ease: "power2.inOut",
    onComplete: () => dot.remove(),
  });
}
