import { state } from "../state.js";
import { magazine } from "../content/magazine.config.js";

export function openJournal() {
  const root = document.getElementById("journal-root");
  const { rows, cols } = magazine.fragments;
  const allFragmentIds = magazine.tiers.flatMap((t) => t.pages.map((p) => p.fragmentId));

  const slots = allFragmentIds
    .map((id) => `<div class="journal-slot ${state.fragmentsSurfaced.has(id) ? "filled" : ""}" data-fragment="${id}"></div>`)
    .join("");

  root.innerHTML = `
    <div class="journal-card folk-border" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
      <button class="journal-close">×</button>
      ${slots}
    </div>
  `;
  root.classList.add("visible");
  root.querySelector(".journal-close").addEventListener("click", closeJournal);
}

export function closeJournal() {
  const root = document.getElementById("journal-root");
  root.classList.remove("visible");
  root.innerHTML = "";
  // Clicking the close button moved DOM focus off the Kaplay canvas, which
  // would leave keyboard input (movement, E) dead until the player clicks
  // back. Restore focus so play resumes immediately.
  document.querySelector("canvas")?.focus();
}

export function isJournalOpen() {
  return document.getElementById("journal-root").classList.contains("visible");
}
