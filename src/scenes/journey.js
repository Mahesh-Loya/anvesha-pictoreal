import gsap from "gsap";
import { magazine } from "../content/magazine.config.js";
import { state } from "../state.js";
import { drawSutradhar } from "../entities/sutradhar.js";
import { openReader, isReaderOpen, closeReader } from "../ui/reader.js";
import { isDialogueOpen, closeDialogue } from "../ui/dialogue.js";
import { surfaceFragment, isJourneyComplete } from "../systems/fragments.js";
import { playFragmentChime, playPageOpen } from "../systems/audio.js";
import { mountHud, updateHudCount, getHudJournalButtonRect } from "../ui/hud.js";
import { isJournalOpen, closeJournal } from "../ui/journal.js";
import { setupAmbiance } from "../systems/ambiance.js";
import { isAnyOverlayOpen } from "../ui/overlays.js";

const AMP = 150; // how far the trail winds left/right
const SPACING = 150; // vertical gap between stops
const TOP = 130; // y of the first stop
const NODE_R = 24;

// Flatten every page across all tiers into one ordered list of "stops".
function buildStops() {
  const stops = [];
  for (const tier of magazine.tiers) {
    for (const page of tier.pages) {
      stops.push({ page, section: tier.section });
    }
  }
  return stops;
}

const isDone = (stop) => state.fragmentsSurfaced.has(stop.page.fragmentId);

// State-of-node helpers relative to the current progress point.
function currentIndex(stops) {
  const i = stops.findIndex((s) => !isDone(s));
  return i === -1 ? stops.length - 1 : i;
}

function drawNode(nodeState, title, t) {
  const MAROON = rgb(122, 34, 48);
  const GOLD = rgb(201, 162, 75);
  const SAFFRON = rgb(217, 122, 43);
  const IVORY = rgb(246, 231, 210);
  const DIYA = rgb(252, 222, 90);

  if (nodeState === "current") {
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 3));
    drawCircle({ pos: vec2(0, 0), radius: (NODE_R + 16) * pulse, color: DIYA, opacity: 0.16 });
  }
  // rim
  drawCircle({ pos: vec2(0, 0), radius: NODE_R + 4, color: MAROON });
  if (nodeState === "locked") {
    drawCircle({ pos: vec2(0, 0), radius: NODE_R, color: rgb(70, 66, 84) });
    drawCircle({ pos: vec2(0, 0), radius: NODE_R - 6, color: rgb(50, 47, 62) });
    // small padlock hint
    drawRect({ pos: vec2(0, 2), width: 10, height: 8, color: rgb(120, 116, 135), anchor: "center", radius: 1 });
    drawCircle({ pos: vec2(0, -2), radius: 4, color: rgb(120, 116, 135) });
    drawCircle({ pos: vec2(0, -2), radius: 2, color: rgb(50, 47, 62) });
  } else if (nodeState === "done") {
    drawCircle({ pos: vec2(0, 0), radius: NODE_R, color: GOLD });
    drawCircle({ pos: vec2(0, 0), radius: NODE_R - 5, color: SAFFRON });
    // check mark
    drawLine({ p1: vec2(-8, 0), p2: vec2(-2, 7), width: 3, color: IVORY });
    drawLine({ p1: vec2(-2, 7), p2: vec2(9, -7), width: 3, color: IVORY });
  } else {
    // current: a lit diya station
    drawCircle({ pos: vec2(0, 0), radius: NODE_R, color: DIYA });
    drawCircle({ pos: vec2(0, 0), radius: NODE_R - 5, color: rgb(255, 245, 200) });
    drawPolygon({ pts: [vec2(0, -9), vec2(-5, 5), vec2(5, 5)], color: SAFFRON });
  }
  // title label below the node
  drawText({
    text: title,
    pos: vec2(0, NODE_R + 12),
    size: 12,
    color: IVORY,
    anchor: "top",
    width: 150,
    align: "center",
  });
}

export function registerJourneyScene() {
  scene("journey", () => {
    const stops = buildStops();
    setupAmbiance(null, { palette: magazine.tiers[0].palette });
    mountHud();

    // node world positions along the winding path
    const nodes = stops.map((stop, i) => ({
      stop,
      index: i,
      pos: vec2(width() / 2 + Math.sin(i * 0.9) * AMP, TOP + i * SPACING),
    }));

    const mapBottom = TOP + (nodes.length - 1) * SPACING;
    const minCamY = Math.min(height() / 2 - 40, TOP);
    const maxCamY = mapBottom + 120 - height() / 2;
    const clampCam = (y) => Math.max(minCamY, Math.min(maxCamY, y));

    // decorative winding trail (dotted), lit up to the current progress
    add([
      z(-50),
      {
        draw() {
          for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i].pos;
            const b = nodes[i + 1].pos;
            const seg = b.sub(a);
            const steps = Math.max(2, Math.floor(seg.len() / 16));
            const lit = isDone(nodes[i].stop);
            for (let k = 1; k < steps; k++) {
              const p = a.add(seg.scale(k / steps));
              drawCircle({
                pos: p,
                radius: 3.5,
                color: lit ? rgb(252, 222, 90) : rgb(95, 89, 115),
                opacity: lit ? 0.9 : 0.5,
              });
            }
          }
        },
      },
    ]);

    // section banner at the top
    add([
      text("The Descent of Anvesha", { size: 18 }),
      pos(width() / 2, 34),
      anchor("center"),
      color(201, 162, 75),
      fixed(),
      z(9),
    ]);
    add([
      text("Follow the path. Tap a glowing stop to uncover its page.", { size: 12 }),
      pos(width() / 2, 58),
      anchor("center"),
      color(246, 231, 210),
      opacity(0.7),
      fixed(),
      z(9),
    ]);

    // the travelling Sutradhar
    let moving = false;
    const startNode = nodes[currentIndex(stops)];
    const avatar = add([
      pos(startNode.pos.x, startNode.pos.y),
      z(30),
      { facing: 1, hop: 0 },
    ]);
    avatar.onDraw(() => {
      pushTransform();
      pushTranslate(0, -avatar.hop - 34); // sit just above the node medallion
      drawSutradhar(time(), moving, avatar.facing);
      popTransform();
    });

    // camera
    let camY = clampCam(startNode.pos.y);
    setCamPos(vec2(width() / 2, camY));
    onScroll((d) => { camY = clampCam(camY + d.y * 0.5); });
    onKeyDown("down", () => { camY = clampCam(camY + 6); });
    onKeyDown("up", () => { camY = clampCam(camY - 6); });
    onKeyDown("s", () => { camY = clampCam(camY + 6); });
    onKeyDown("w", () => { camY = clampCam(camY - 6); });
    onUpdate(() => { setCamPos(vec2(width() / 2, camY)); });

    function openStop(node) {
      openReader(node.stop.page, () => {
        surfaceFragment(node.stop.page.fragmentId);
        playFragmentChime();
        flyFragmentToJournal();
        updateHudCount();
      });
    }

    function goToNode(node, onArrive) {
      if (moving) return;
      moving = true;
      const from = avatar.pos.clone();
      const to = node.pos;
      avatar.facing = to.x >= from.x ? 1 : -1;
      const dur = 0.5;
      let el = 0;
      const ctrl = avatar.onUpdate(() => {
        el += dt();
        const k = Math.min(1, el / dur);
        avatar.pos = from.lerp(to, k);
        avatar.hop = Math.sin(k * Math.PI) * 22;
        camY = clampCam(avatar.pos.y);
        if (k >= 1) {
          avatar.hop = 0;
          moving = false;
          ctrl.cancel();
          onArrive();
        }
      });
    }

    // each node is clickable
    for (const node of nodes) {
      const hit = NODE_R + 10;
      const clicker = add([
        pos(node.pos),
        anchor("center"),
        area({ shape: new Rect(vec2(-hit, -hit), hit * 2, hit * 2) }),
        z(20),
        { node },
      ]);
      clicker.onDraw(() => {
        const cur = currentIndex(stops);
        const s = isDone(node.stop) ? "done" : node.index === cur ? "current" : node.index < cur ? "done" : "locked";
        drawNode(s, node.stop.page.title, time());
      });
      clicker.onClick(() => {
        if (isAnyOverlayOpen() || moving) return;
        const cur = currentIndex(stops);
        if (node.index > cur) {
          playPageOpen(); // small feedback; locked
          return;
        }
        goToNode(node, () => openStop(node));
      });
    }

    // keyboard: Enter/E opens the current node
    function openCurrent() {
      if (isAnyOverlayOpen() || moving) return;
      const node = nodes[currentIndex(stops)];
      goToNode(node, () => openStop(node));
    }
    onKeyPress("e", openCurrent);
    onKeyPress("enter", openCurrent);
    onKeyPress("space", openCurrent);

    // escape closes whichever overlay is on top
    onKeyPress("escape", () => {
      if (isReaderOpen()) return closeReader();
      if (isJournalOpen()) return closeJournal();
      if (isDialogueOpen()) return closeDialogue();
    });

    // when the reader closes, check for completion
    let wasReaderOpen = false;
    onUpdate(() => {
      const open = isReaderOpen();
      if (wasReaderOpen && !open && isJourneyComplete()) go("ending");
      wasReaderOpen = open;
    });
  });
}

function flyFragmentToJournal() {
  const flightRoot = document.getElementById("fragment-flight-root");
  const start = document.querySelector(".reader-card")?.getBoundingClientRect();
  const end = getHudJournalButtonRect();
  if (!start) return;
  const dot = document.createElement("div");
  dot.className = "flying-fragment";
  dot.style.left = `${start.left + start.width / 2}px`;
  dot.style.top = `${start.top + start.height / 2}px`;
  flightRoot.appendChild(dot);
  gsap.to(dot, {
    left: end.left + end.width / 2,
    top: end.top + end.height / 2,
    duration: 0.9,
    ease: "power2.inOut",
    onComplete: () => dot.remove(),
  });
}
