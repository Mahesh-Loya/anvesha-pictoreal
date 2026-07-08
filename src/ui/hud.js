import { getSurfacedCount, getTotalFragments } from "../systems/fragments.js";
import { toggleMute, isMuted } from "../systems/audio.js";
import { openJournal } from "./journal.js";
import { openContents } from "./contents.js";
import gsap from "gsap";

export function mountHud() {
  const root = document.getElementById("hud-root");
  root.innerHTML = `
    <div class="hud-counter" id="hud-counter">Uncovered: ${getSurfacedCount()} / ${getTotalFragments()}</div>
    <div class="hud-buttons">
      <button id="hud-index" title="Index">☰</button>
      <button id="hud-journal" title="Collection">📖</button>
      <button id="hud-mute" title="Sound">${isMuted() ? "🔇" : "🔊"}</button>
    </div>
  `;
  document.getElementById("hud-mute").addEventListener("click", () => {
    const muted = toggleMute();
    document.getElementById("hud-mute").textContent = muted ? "🔇" : "🔊";
    // Clicking a button steals DOM focus from the Kaplay canvas, which would
    // leave keyboard input dead until the player clicks back in. Restore it.
    document.querySelector("canvas")?.focus();
  });
  document.getElementById("hud-journal").addEventListener("click", () => {
    openJournal();
    document.querySelector("canvas")?.focus();
  });
  document.getElementById("hud-index").addEventListener("click", () => {
    openContents();
    document.querySelector("canvas")?.focus();
  });
}

export function updateHudCount() {
  const counter = document.getElementById("hud-counter");
  if (!counter) return;
  counter.textContent = `Uncovered: ${getSurfacedCount()} / ${getTotalFragments()}`;
  gsap.fromTo(counter, { scale: 1 }, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.inOut" });
}

export function getHudJournalButtonRect() {
  return document.getElementById("hud-journal").getBoundingClientRect();
}
