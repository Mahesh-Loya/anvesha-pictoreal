import { state } from "../state.js";
import { magazine } from "../content/magazine.config.js";
import gsap from "gsap";

export function openJournal({ animateThread = false } = {}) {
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
      <svg class="journal-thread" viewBox="0 0 1 1" preserveAspectRatio="none"></svg>
    </div>
  `;
  root.classList.add("visible");
  root.querySelector(".journal-close").addEventListener("click", closeJournal);

  if (animateThread) {
    requestAnimationFrame(() => drawThreadOfLight(root, allFragmentIds));
  }
}

function drawThreadOfLight(root, allFragmentIds) {
  const card = root.querySelector(".journal-card");
  const svg = root.querySelector(".journal-thread");
  const cardRect = card.getBoundingClientRect();

  const points = allFragmentIds
    .filter((id) => state.fragmentsSurfaced.has(id))
    .map((id) => {
      const slot = card.querySelector(`[data-fragment="${id}"]`);
      const r = slot.getBoundingClientRect();
      const x = (r.left + r.width / 2 - cardRect.left) / cardRect.width;
      const y = (r.top + r.height / 2 - cardRect.top) / cardRect.height;
      return `${x},${y}`;
    });

  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", points.join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "var(--diya-gold)");
  line.setAttribute("stroke-width", "0.006");
  line.setAttribute("vector-effect", "non-scaling-stroke");
  svg.appendChild(line);

  const length = line.getTotalLength();
  line.style.strokeDasharray = `${length}`;
  line.style.strokeDashoffset = `${length}`;
  gsap.to(line, { strokeDashoffset: 0, duration: 1.2, ease: "power1.inOut" });
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
