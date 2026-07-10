import gsap from "gsap";
import { playPageOpen } from "../systems/audio.js";
import { speak, stopSpeaking, isVoiceEnabled } from "../systems/voice.js";

const readPageIds = new Set();
let currentPageData = null;
let zoom = 1;

export function isReaderOpen() {
  return document.getElementById("reader-root").classList.contains("visible");
}

export function openReader(pageData, onFirstRead) {
  // Guard against re-opening while already open (e.g. pressing E on a marker
  // mid-read), which would reset zoom and re-render the same page.
  if (isReaderOpen()) return;
  currentPageData = pageData;
  zoom = 1;
  playPageOpen();

  const root = document.getElementById("reader-root");
  const hasHidden = Boolean(pageData.hiddenImage);

  const readText = `${pageData.title}. ${pageData.caption}. ${pageData.blurb || ""}`;
  const readLang = pageData.lang; // "en" | "hi" | "mr" (voice auto-detects if absent)
  root.innerHTML = `
    <div class="reader-card folk-border">
      <button class="reader-close" aria-label="Close">×</button>
      <button class="reader-listen" aria-label="Read aloud">🔊 Read aloud</button>
      <div class="reader-image-wrap">
        <img class="surface-layer" src="${pageData.surfaceImage}" alt="${pageData.title}" />
        ${hasHidden ? `<img class="hidden-layer" src="${pageData.hiddenImage}" alt="${pageData.title} hidden layer" />` : ""}
      </div>
      ${hasHidden ? `<div class="reader-peel-hint">Drag or click a corner to lift the page</div>` : ""}
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
  // auto-read the page on open if voice is on
  if (isVoiceEnabled()) setTimeout(() => speak(readText, { rate: 0.92, lang: readLang }), 350);

  const wrap = root.querySelector(".reader-image-wrap");
  wrap.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoom = Math.min(3, Math.max(1, zoom - e.deltaY * 0.001));
    wrap.querySelector(".surface-layer").style.transform = `scale(${zoom})`;
  });

  if (hasHidden) {
    const hiddenImg = wrap.querySelector(".hidden-layer");
    wrap.addEventListener("click", () => peel(hiddenImg));
  }

  if (!readPageIds.has(pageData.id)) {
    readPageIds.add(pageData.id);
    onFirstRead(pageData);
  }
}

function peel(hiddenImg) {
  gsap.to(hiddenImg, {
    duration: 0.6,
    ease: "power2.out",
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
  });
}

export function closeReader() {
  const root = document.getElementById("reader-root");
  root.classList.remove("visible");
  root.innerHTML = "";
  currentPageData = null;
  stopSpeaking();
  // Clicking the close button moved DOM focus off the Kaplay canvas, which
  // would leave keyboard input (movement, E) dead until the player clicks
  // back. Restore focus so play resumes immediately.
  document.querySelector("canvas")?.focus();
}
