let lineIndex = 0;
let currentLines = [];

export function openDialogue(lines) {
  const root = document.getElementById("dialogue-root");
  if (root.classList.contains("visible") && currentLines === lines) {
    lineIndex = (lineIndex + 1) % currentLines.length;
  } else {
    currentLines = lines;
    lineIndex = 0;
  }
  root.innerHTML = `<div class="dialogue-box folk-border"><p>${currentLines[lineIndex]}</p><span class="dialogue-hint">Press E to continue</span></div>`;
  root.classList.add("visible");
}

export function closeDialogue() {
  const root = document.getElementById("dialogue-root");
  root.classList.remove("visible");
  root.innerHTML = "";
  currentLines = [];
  lineIndex = 0;
}

export function isDialogueOpen() {
  return document.getElementById("dialogue-root").classList.contains("visible");
}
