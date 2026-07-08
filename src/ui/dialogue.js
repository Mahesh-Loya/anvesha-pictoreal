let lineIndex = 0;
let currentLines = [];

export function openDialogue(lines) {
  currentLines = lines;
  lineIndex = 0;
  render();
}

// Advance to the next line; closes the box once the last line is dismissed.
// Returns true if a new line was shown, false if the dialogue finished.
export function advanceDialogue() {
  if (lineIndex < currentLines.length - 1) {
    lineIndex++;
    render();
    return true;
  }
  closeDialogue();
  return false;
}

function render() {
  const root = document.getElementById("dialogue-root");
  const isLast = lineIndex >= currentLines.length - 1;
  const hint = isLast ? "Press E to close" : "Press E to continue";
  root.innerHTML = `<div class="dialogue-box folk-border"><p>${currentLines[lineIndex]}</p><span class="dialogue-hint">${hint}</span></div>`;
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
