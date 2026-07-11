import { playPageOpen } from "../systems/audio.js";
import { speak, stopSpeaking, isVoiceEnabled } from "../systems/voice.js";

const readPageIds = new Set();
let currentPageData = null;
let autoReadTimer = null; // pending auto-read; must die with the reader

export function isReaderOpen() {
  return document.getElementById("reader-root").classList.contains("visible");
}

export function openReader(pageData, onFirstRead) {
  // Guard against re-opening while already open (e.g. pressing E on a marker
  // mid-read), which would re-render the same page.
  if (isReaderOpen()) return;
  currentPageData = pageData;
  playPageOpen();

  const root = document.getElementById("reader-root");

  const readText = `${pageData.title}. ${pageData.caption}. ${pageData.blurb || ""}`;
  const readLang = pageData.lang; // "en" | "hi" | "mr" (voice auto-detects if absent)
  root.innerHTML = `
    <div class="reader-card folk-border">
      <button class="reader-close" aria-label="Close">×</button>
      <button class="reader-listen" aria-label="Read aloud">🔊 Read aloud</button>
      <div class="reader-image-wrap">
        <img class="surface-layer" src="${pageData.surfaceImage}" alt="${pageData.title}" draggable="false" />
        <div class="reader-zoom-hint">scroll / pinch to zoom · drag to pan · double-tap to reset</div>
      </div>
      ${pageData.blurb ? `<div class="reader-blurb">${pageData.blurb}</div>` : ""}
      <div class="reader-caption-plate">
        <span>${pageData.caption}</span>
        <span>${pageData.title}</span>
      </div>
    </div>
  `;
  root.classList.add("visible");

  root.querySelector(".reader-close").addEventListener("click", closeReader);
  const listenBtn = root.querySelector(".reader-listen");
  listenBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    speak(readText, { rate: 0.92, lang: readLang });
  });
  // auto-read the page on open if voice is on. Keep the timer handle: if the
  // reader closes within these 350ms the speech would start AFTER close and
  // keep talking over the game — closeReader() cancels it.
  if (isVoiceEnabled()) {
    autoReadTimer = setTimeout(() => {
      autoReadTimer = null;
      if (isReaderOpen()) speak(readText, { rate: 0.92, lang: readLang });
    }, 350);
  }

  setupPanZoom(root.querySelector(".reader-image-wrap"));

  if (!readPageIds.has(pageData.id)) {
    readPageIds.add(pageData.id);
    onFirstRead(pageData);
  }
}

// Full pan/zoom for the page image: mouse wheel (zoom to cursor), pinch (touch),
// drag to pan when zoomed, double-tap/click to toggle, and +/-/fit buttons.
function setupPanZoom(wrap) {
  const img = wrap.querySelector(".surface-layer");
  let scale = 1, tx = 0, ty = 0;
  const MIN = 1, MAX = 5;
  const pointers = new Map(); // active pointerId -> {x, y}
  let panStart = null, pinchDist = 0, pinchScale = 1, moved = false, lastTap = 0;

  const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
  const clamp = () => {
    const r = wrap.getBoundingClientRect();
    const mx = (r.width * (scale - 1)) / 2, my = (r.height * (scale - 1)) / 2;
    tx = Math.max(-mx, Math.min(mx, tx));
    ty = Math.max(-my, Math.min(my, ty));
  };
  // keep the content point under (px,py) — offsets from wrap centre — fixed
  const zoomAt = (px, py, next) => {
    next = Math.max(MIN, Math.min(MAX, next));
    const k = next / scale;
    tx = px - k * (px - tx);
    ty = py - k * (py - ty);
    scale = next;
    if (scale <= MIN + 0.001) { scale = 1; tx = 0; ty = 0; }
    clamp(); apply();
    wrap.classList.toggle("zoomed", scale > 1);
  };
  const off = (cx, cy) => {
    const r = wrap.getBoundingClientRect();
    return [cx - (r.left + r.width / 2), cy - (r.top + r.height / 2)];
  };

  wrap.addEventListener("wheel", (e) => {
    e.preventDefault();
    const [px, py] = off(e.clientX, e.clientY);
    zoomAt(px, py, scale * (e.deltaY < 0 ? 1.18 : 1 / 1.18));
  }, { passive: false });

  wrap.addEventListener("pointerdown", (e) => {
    wrap.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      pinchScale = scale;
      panStart = null;
    } else {
      panStart = { x: e.clientX, y: e.clientY, tx, ty };
    }
  });
  wrap.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const [mx, my] = off((a.x + b.x) / 2, (a.y + b.y) / 2);
      zoomAt(mx, my, pinchScale * (dist / pinchDist));
      moved = true;
    } else if (panStart && scale > 1) {
      tx = panStart.tx + (e.clientX - panStart.x);
      ty = panStart.ty + (e.clientY - panStart.y);
      moved = true;
      clamp(); apply();
    }
  });
  const release = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 1) {
      const [p] = [...pointers.values()];
      panStart = { x: p.x, y: p.y, tx, ty };
    } else if (pointers.size === 0) {
      panStart = null;
      // double-tap (touch) to toggle zoom
      if (e.pointerType === "touch" && !moved) {
        const now = Date.now();
        if (now - lastTap < 300) { const [px, py] = off(e.clientX, e.clientY); zoomAt(px, py, scale > 1 ? 1 : 2.6); }
        lastTap = now;
      }
    }
  };
  wrap.addEventListener("pointerup", release);
  wrap.addEventListener("pointercancel", release);
  wrap.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const [px, py] = off(e.clientX, e.clientY);
    zoomAt(px, py, scale > 1 ? 1 : 2.6);
  });

  // fade the gesture hint away after a few seconds
  const hint = wrap.querySelector(".reader-zoom-hint");
  setTimeout(() => hint && hint.classList.add("gone"), 3600);
}

export function closeReader() {
  const root = document.getElementById("reader-root");
  root.classList.remove("visible");
  root.innerHTML = "";
  currentPageData = null;
  if (autoReadTimer) { clearTimeout(autoReadTimer); autoReadTimer = null; }
  stopSpeaking();
  // Clicking the close button moved DOM focus off the Kaplay canvas, which
  // would leave keyboard input (movement, E) dead until the player clicks
  // back. Restore focus so play resumes immediately.
  document.querySelector("canvas")?.focus();
}
