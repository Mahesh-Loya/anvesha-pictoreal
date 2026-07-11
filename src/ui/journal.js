import { state } from "../state.js";
import { magazine } from "../content/magazine.config.js";
import { getSurfacedCount, getTotalFragments } from "../systems/fragments.js";
import { jumpToPage } from "./jump.js";

// The Collection — a gallery of every page in the magazine. Pages you've
// uncovered show their cover in full colour; the rest wait as dark, locked
// tiles. Tap an uncovered page to fly the Sutradhar back to it.
export function openJournal() {
  const root = document.getElementById("journal-root");

  const sections = magazine.tiers
    .map((tier) => {
      const tiles = tier.pages
        .map((page) => {
          const done = state.fragmentsSurfaced.has(page.fragmentId);
          const thumb = page.surfaceImage.replace("pages/real/", "pages/thumb/");
          if (done) {
            return `<button class="col-tile found" data-page="${page.id}" title="${page.title}">
              <img src="${thumb}" alt="${page.title}" loading="lazy" />
            </button>`;
          }
          return `<div class="col-tile locked" title="Not yet uncovered">✦</div>`;
        })
        .join("");
      return `<div class="col-section">
        <div class="col-section-name">${tier.section}</div>
        <div class="col-grid">${tiles}</div>
      </div>`;
    })
    .join("");

  root.innerHTML = `
    <div class="collection-card folk-border">
      <button class="collection-close" aria-label="Close">×</button>
      <div class="collection-head">
        <span>Your Collection</span>
        <span class="collection-count">${getSurfacedCount()} / ${getTotalFragments()} uncovered</span>
      </div>
      <div class="collection-scroll">${sections}</div>
    </div>`;
  root.classList.add("visible");

  root.querySelector(".collection-close").addEventListener("click", closeJournal);
  root.querySelectorAll(".col-tile.found").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pageId = btn.getAttribute("data-page");
      closeJournal();
      jumpToPage(pageId);
    });
  });
}

export function closeJournal() {
  const root = document.getElementById("journal-root");
  root.classList.remove("visible");
  root.innerHTML = "";
  // Clicking a button steals focus from the canvas; restore so keys work.
  document.querySelector("canvas")?.focus();
}

export function isJournalOpen() {
  return document.getElementById("journal-root").classList.contains("visible");
}
