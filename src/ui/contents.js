import { magazine } from "../content/magazine.config.js";
import { state } from "../state.js";

// The Index — the magazine's table of contents. Lists every section and its
// pages with lock/done state; clicking an unlocked page jumps the Sutradhar
// there. The jump behaviour is provided by the journey scene.
let jumpHandler = null;
export function setJumpHandler(fn) {
  jumpHandler = fn;
}

// Flatten to know global ordering (for lock state = first not-done).
function flatPages() {
  return magazine.tiers.flatMap((t) => t.pages);
}
function currentGlobalIndex() {
  const all = flatPages();
  const i = all.findIndex((p) => !state.fragmentsSurfaced.has(p.fragmentId));
  return i === -1 ? all.length - 1 : i;
}

export function openContents() {
  const root = document.getElementById("contents-root");
  const all = flatPages();
  const cur = currentGlobalIndex();
  let gi = 0;

  const sections = magazine.tiers
    .map((tier) => {
      const rows = tier.pages
        .map((page) => {
          const done = state.fragmentsSurfaced.has(page.fragmentId);
          const idxInAll = all.findIndex((p) => p.id === page.id);
          // PROTOTYPE: every page is jumpable from the index so we can hop to
          // any language and test the read-aloud voice. Restore `idxInAll > cur`
          // to re-enable sequential unlocking.
          const locked = false;
          const cls = done ? "done" : locked ? "locked" : "current";
          const mark = done ? "✓" : locked ? "✦" : "▸";
          gi++;
          return `<button class="toc-row ${cls}" data-page="${page.id}" ${locked ? "disabled" : ""}>
            <span class="toc-mark">${mark}</span>
            <span class="toc-title">${page.title}</span>
            <span class="toc-cap">${page.caption || ""}</span>
          </button>`;
        })
        .join("");
      return `<div class="toc-section"><div class="toc-section-name">${tier.section}</div>${rows}</div>`;
    })
    .join("");

  root.innerHTML = `
    <div class="contents-card folk-border">
      <button class="contents-close" aria-label="Close">×</button>
      <div class="contents-head">Index — Pictoreal · Volume 28</div>
      <div class="contents-scroll">${sections}</div>
    </div>`;
  root.classList.add("visible");

  root.querySelector(".contents-close").addEventListener("click", closeContents);
  root.querySelectorAll(".toc-row:not(.locked)").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pageId = btn.getAttribute("data-page");
      closeContents();
      if (jumpHandler) jumpHandler(pageId);
    });
  });
}

export function closeContents() {
  const root = document.getElementById("contents-root");
  root.classList.remove("visible");
  root.innerHTML = "";
  document.querySelector("canvas")?.focus();
}

export function isContentsOpen() {
  return document.getElementById("contents-root").classList.contains("visible");
}
