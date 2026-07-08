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
import { isAnyOverlayOpen } from "../ui/overlays.js";

const AMP = 155;
const SPACING = 155;
const TOP = 150;
const NODE_R = 26;

// brand palette
const TEAL_MID = () => rgb(20, 80, 70);
const SILVER = () => rgb(223, 230, 226);
const SILVER_DIM = () => rgb(120, 150, 142);
const GOLD = () => rgb(252, 222, 90);
const RIM = () => rgb(8, 32, 27);

function buildStops() {
  const stops = [];
  for (const tier of magazine.tiers) {
    for (const page of tier.pages) stops.push({ page, section: tier.section });
  }
  return stops;
}

const isDone = (stop) => state.fragmentsSurfaced.has(stop.page.fragmentId);
function currentIndex(stops) {
  const i = stops.findIndex((s) => !isDone(s));
  return i === -1 ? stops.length - 1 : i;
}

// A ring of outward-pointing petals — the core mandala motif.
function petalRing(cx, cy, r, n, rot, color, opacity, petalLen = 6, w = 3) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const perp = a + Math.PI / 2;
    const pw = Math.cos(perp) * w;
    const ph = Math.sin(perp) * w;
    drawPolygon({
      pts: [
        vec2(cx + ca * (r - 4), cy + sa * (r - 4)),
        vec2(cx + ca * r + pw, cy + sa * r + ph),
        vec2(cx + ca * (r + petalLen), cy + sa * (r + petalLen)),
        vec2(cx + ca * r - pw, cy + sa * r - ph),
      ],
      color,
      opacity,
    });
  }
}

function drawNodeMandala(nodeState, title, t, seed) {
  const rot = t * 0.35 + seed;
  if (nodeState === "current") {
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(t * 3));
    drawCircle({ pos: vec2(0, 0), radius: (NODE_R + 20) * pulse, color: GOLD(), opacity: 0.16 });
    petalRing(0, 0, NODE_R + 8, 12, rot, GOLD(), 0.9, 7);
  } else if (nodeState === "done") {
    petalRing(0, 0, NODE_R + 6, 12, rot * 0.5, SILVER(), 0.55, 5);
  } else {
    petalRing(0, 0, NODE_R + 6, 12, rot * 0.3, SILVER_DIM(), 0.3, 4);
  }

  // rim + inner disc
  drawCircle({ pos: vec2(0, 0), radius: NODE_R, color: RIM() });
  const inner =
    nodeState === "current" ? rgb(18, 72, 64) : nodeState === "done" ? rgb(15, 58, 51) : rgb(9, 34, 29);
  drawCircle({ pos: vec2(0, 0), radius: NODE_R - 3, color: inner });

  // counter-rotating inner petal ring
  const innerCol = nodeState === "locked" ? SILVER_DIM() : nodeState === "current" ? GOLD() : SILVER();
  petalRing(0, 0, NODE_R - 12, 8, -rot * 1.3, innerCol, nodeState === "locked" ? 0.35 : 0.7, 4, 2);

  // center icon
  if (nodeState === "current") {
    drawCircle({ pos: vec2(0, 0), radius: 7, color: rgb(255, 245, 200) });
    drawPolygon({ pts: [vec2(0, -9), vec2(-5, 4), vec2(5, 4)], color: rgb(217, 122, 43) });
  } else if (nodeState === "done") {
    drawCircle({ pos: vec2(0, 0), radius: 8, color: rgb(20, 90, 78) });
    drawLine({ p1: vec2(-6, 0), p2: vec2(-1, 6), width: 3, color: SILVER() });
    drawLine({ p1: vec2(-1, 6), p2: vec2(7, -6), width: 3, color: SILVER() });
  } else {
    drawRect({ pos: vec2(0, 2), width: 9, height: 7, color: SILVER_DIM(), anchor: "center", radius: 1 });
    drawCircle({ pos: vec2(0, -1), radius: 4, color: SILVER_DIM() });
    drawCircle({ pos: vec2(0, -1), radius: 2, color: inner });
  }

  drawText({
    text: title,
    pos: vec2(0, NODE_R + 14),
    size: 12,
    color: nodeState === "locked" ? SILVER_DIM() : SILVER(),
    anchor: "top",
    width: 150,
    align: "center",
  });
}

export function registerJourneyScene() {
  scene("journey", () => {
    const stops = buildStops();
    mountHud();

    const nodes = stops.map((stop, i) => ({
      stop,
      index: i,
      pos: vec2(width() / 2 + Math.sin(i * 0.9) * AMP, TOP + i * SPACING),
      seed: i * 1.7,
    }));

    const mapBottom = TOP + (nodes.length - 1) * SPACING;
    const minCamY = Math.min(height() / 2 - 40, TOP);
    const maxCamY = mapBottom + 130 - height() / 2;
    const clampCam = (y) => Math.max(minCamY, Math.min(maxCamY, y));

    // ---- rich animated background (fixed to the screen) ----
    add([
      fixed(),
      z(-60),
      {
        draw() {
          const t = time();
          const cx = width() / 2;
          const cy = height() / 2;
          // soft teal glow center
          for (let i = 0; i < 3; i++) {
            drawCircle({ pos: vec2(cx, cy), radius: 180 + i * 90, color: TEAL_MID(), opacity: 0.10 - i * 0.025 });
          }
          // big slow mandala watermark
          petalRing(cx, cy, 240, 24, t * 0.05, SILVER(), 0.05, 30, 8);
          petalRing(cx, cy, 180, 18, -t * 0.07, SILVER(), 0.06, 24, 6);
          petalRing(cx, cy, 120, 12, t * 0.09, SILVER(), 0.07, 18, 5);
          drawCircle({ pos: vec2(cx, cy), radius: 70, color: SILVER(), opacity: 0.03 });
        },
      },
    ]);
    // drifting motes
    for (let i = 0; i < 26; i++) {
      const sx = (i * 137) % width();
      const m = add([pos(sx, (i * 89) % height()), fixed(), z(-50), { bx: sx, sp: 7 + (i % 5) * 4, ph: (i * 0.7) % 6.28, sz: 1 + (i % 3) }]);
      m.onUpdate(() => {
        m.pos.y -= m.sp * dt();
        if (m.pos.y < -8) { m.pos.y = height() + 8; m.bx = (m.bx + 213) % width(); }
        m.pos.x = m.bx + Math.sin(time() * 0.6 + m.ph) * 10;
      });
      m.onDraw(() => {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(time() * 1.5 + m.ph));
        drawCircle({ pos: vec2(0, 0), radius: m.sz * 2.2, color: TEAL_MID(), opacity: 0.06 * tw });
        drawCircle({ pos: vec2(0, 0), radius: m.sz, color: SILVER(), opacity: 0.45 * tw });
      });
    }

    // ---- banners (fixed) ----
    add([text("PICTOREAL · Volume 28", { size: 13 }), pos(width() / 2, 26), anchor("center"), color(159, 179, 172), fixed(), z(9)]);
    add([text("The Descent", { size: 22 }), pos(width() / 2, 50), anchor("center"), color(223, 230, 226), fixed(), z(9)]);
    const hint = add([text("Tap the glowing stop to uncover its page", { size: 12 }), pos(width() / 2, 74), anchor("center"), color(159, 179, 172), opacity(0.8), fixed(), z(9)]);
    hint.onUpdate(() => { hint.opacity = 0.5 + 0.4 * Math.abs(Math.sin(time() * 1.6)); });

    // ---- winding trail with a travelling light pulse ----
    add([
      z(-40),
      {
        draw() {
          const t = time();
          for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i].pos;
            const b = nodes[i + 1].pos;
            const seg = b.sub(a);
            const steps = Math.max(3, Math.floor(seg.len() / 15));
            const lit = isDone(nodes[i].stop);
            for (let k = 1; k < steps; k++) {
              const f = k / steps;
              const p = a.add(seg.scale(f));
              // travelling sparkle along lit segments
              const pulse = lit ? 0.5 + 0.5 * Math.sin(t * 3 - i - f * 3) : 0;
              drawCircle({
                pos: p,
                radius: 3.2 + pulse * 1.5,
                color: lit ? GOLD() : SILVER_DIM(),
                opacity: lit ? 0.55 + pulse * 0.45 : 0.4,
              });
            }
          }
        },
      },
    ]);

    // ---- the travelling Sutradhar ----
    let moving = false;
    const startNode = nodes[currentIndex(stops)];
    const avatar = add([pos(startNode.pos.x, startNode.pos.y), z(30), { facing: 1, hop: 0 }]);
    avatar.onDraw(() => {
      pushTransform();
      pushTranslate(0, -avatar.hop - 36);
      drawSutradhar(time(), moving, avatar.facing);
      popTransform();
    });

    // ---- camera ----
    let camY = clampCam(startNode.pos.y);
    setCamPos(vec2(width() / 2, camY));
    onScroll((d) => { camY = clampCam(camY + d.y * 0.5); });
    onKeyDown("down", () => { camY = clampCam(camY + 6); });
    onKeyDown("up", () => { camY = clampCam(camY - 6); });
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
        avatar.hop = Math.sin(k * Math.PI) * 24;
        camY = clampCam(avatar.pos.y);
        if (k >= 1) { avatar.hop = 0; moving = false; ctrl.cancel(); onArrive(); }
      });
    }

    // ---- clickable nodes ----
    for (const node of nodes) {
      const hit = NODE_R + 12;
      const clicker = add([pos(node.pos), anchor("center"), area({ shape: new Rect(vec2(-hit, -hit), hit * 2, hit * 2) }), z(20), { node }]);
      clicker.onDraw(() => {
        const cur = currentIndex(stops);
        const s = isDone(node.stop) ? "done" : node.index === cur ? "current" : node.index < cur ? "done" : "locked";
        drawNodeMandala(s, node.stop.page.title, time(), node.seed);
      });
      clicker.onClick(() => {
        if (isAnyOverlayOpen() || moving) return;
        const cur = currentIndex(stops);
        if (node.index > cur) { playPageOpen(); return; }
        goToNode(node, () => openStop(node));
      });
    }

    function openCurrent() {
      if (isAnyOverlayOpen() || moving) return;
      const node = nodes[currentIndex(stops)];
      goToNode(node, () => openStop(node));
    }
    onKeyPress("e", openCurrent);
    onKeyPress("enter", openCurrent);
    onKeyPress("space", openCurrent);

    onKeyPress("escape", () => {
      if (isReaderOpen()) return closeReader();
      if (isJournalOpen()) return closeJournal();
      if (isDialogueOpen()) return closeDialogue();
    });

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
