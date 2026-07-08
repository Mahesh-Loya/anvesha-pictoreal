// The Sutradhar's narration box — a bottom panel where the guide speaks.
// Distinct from NPC dialogue: it carries a portrait and the Sutradhar's name,
// and is used for the welcome, section intros, and closing lines.
let lines = [];
let idx = 0;
let doneCb = null;

// A small mandala-eye portrait (echoes the Pictoreal seal) as an inline SVG.
const PORTRAIT = `
  <svg viewBox="0 0 64 64" class="narr-portrait">
    <circle cx="32" cy="32" r="30" fill="#0a2c26" stroke="#dfe6e2" stroke-width="1.5"/>
    <path d="M8 32 Q32 14 56 32 Q32 50 8 32 Z" fill="none" stroke="#dfe6e2" stroke-width="1.5"/>
    <circle cx="32" cy="32" r="9" fill="none" stroke="#dfe6e2" stroke-width="1.2"/>
    <circle cx="32" cy="32" r="3.5" fill="#fcde5a"/>
  </svg>`;

function render() {
  const root = document.getElementById("narration-root");
  const last = idx >= lines.length - 1;
  root.innerHTML = `
    <div class="narration-box folk-border">
      ${PORTRAIT}
      <div class="narr-body">
        <div class="narr-name">The Sutradhar</div>
        <p class="narr-line">${lines[idx]}</p>
      </div>
      <span class="narr-hint">${last ? "tap / space ✦" : "tap / space ▸"}</span>
    </div>`;
  root.classList.add("visible");
  root.querySelector(".narration-box").addEventListener("click", advanceNarration);
}

export function narrate(newLines, onDone) {
  lines = Array.isArray(newLines) ? newLines : [newLines];
  idx = 0;
  doneCb = onDone || null;
  render();
}

export function advanceNarration() {
  if (!isNarrating()) return;
  if (idx < lines.length - 1) {
    idx++;
    render();
  } else {
    closeNarration();
    const cb = doneCb;
    doneCb = null;
    if (cb) cb();
  }
}

export function closeNarration() {
  const root = document.getElementById("narration-root");
  root.classList.remove("visible");
  root.innerHTML = "";
  lines = [];
  idx = 0;
  document.querySelector("canvas")?.focus();
}

export function isNarrating() {
  return document.getElementById("narration-root").classList.contains("visible");
}
