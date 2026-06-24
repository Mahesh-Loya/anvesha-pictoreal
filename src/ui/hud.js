import { getSurfacedCount, getTotalFragments } from "../systems/fragments.js";
import { toggleMute, isMuted } from "../systems/audio.js";
import { openJournal } from "./journal.js";
import gsap from "gsap";

export function mountHud() {
  const root = document.getElementById("hud-root");
  root.innerHTML = `
    <div class="hud-counter" id="hud-counter">Surfaced: ${getSurfacedCount()} / ${getTotalFragments()}</div>
    <div class="hud-buttons">
      <button id="hud-mute">${isMuted() ? "🔇" : "🔊"}</button>
      <button id="hud-journal">📖</button>
    </div>
  `;
  document.getElementById("hud-mute").addEventListener("click", () => {
    const muted = toggleMute();
    document.getElementById("hud-mute").textContent = muted ? "🔇" : "🔊";
    // Clicking this button steals DOM focus from the Kaplay canvas, which
    // would leave movement/interaction keys dead until the player clicks
    // back in. Restore focus immediately since this button leaves the
    // player in-world.
    document.querySelector("canvas")?.focus();
  });
  document.getElementById("hud-journal").addEventListener("click", () => {
    openJournal();
    document.querySelector("canvas")?.focus();
  });
}

export function updateHudCount() {
  const counter = document.getElementById("hud-counter");
  if (!counter) return;
  counter.textContent = `Surfaced: ${getSurfacedCount()} / ${getTotalFragments()}`;
  gsap.fromTo(counter, { scale: 1 }, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.inOut" });
}

export function getHudJournalButtonRect() {
  return document.getElementById("hud-journal").getBoundingClientRect();
}
