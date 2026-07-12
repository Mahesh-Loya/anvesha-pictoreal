import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { generateCave, isWalkable, slideMove } from "./world/cave.js";
import gsap from "gsap";
import { magazine } from "./content/magazine.config.js";
import { state } from "./state.js";
import { surfaceFragment, isJourneyComplete, getSurfacedCount, getTotalFragments } from "./systems/fragments.js";
import { playFragmentChime, playFootstep, startAmbientMusic, playDescentRumble, setMusicDucked } from "./systems/audio.js";
import { openReader, isReaderOpen, closeReader } from "./ui/reader.js";
import { openJournal, isJournalOpen, closeJournal } from "./ui/journal.js";
import { openContents, isContentsOpen, closeContents } from "./ui/contents.js";
import { setJumpHandler, jumpToPage } from "./ui/jump.js";
import { narrate, advanceNarration, isNarrating } from "./ui/narration.js";
import { mountHud, updateHudCount, getHudJournalButtonRect } from "./ui/hud.js";
import { isAnyOverlayOpen } from "./ui/overlays.js";
import { isSpeaking, stopSpeaking } from "./systems/voice.js";
import { initTouchControls, touchMove, isTouchDevice } from "./ui/touch.js";

// ---------------------------------------------------------------------------
// Pictoreal · Volume 28 — a 3D descent through a stepwell. Each magazine page
// is a glowing tablet on a landing; walk the Sutradhar near one and press E
// (or click it) to open the page. Reuses the DOM reader / index / narration /
// HUD, so all reading UI is shared with the 2D build.
// ---------------------------------------------------------------------------

// flat ordered list of pages, each tagged with its section + intro
const STOPS = [];
for (const tier of magazine.tiers) {
  tier.pages.forEach((page, pi) => {
    STOPS.push({ page, section: tier.section, tierId: tier.id, intro: tier.intro, firstOfSection: pi === 0 });
  });
}
const isDone = (s) => state.fragmentsSurfaced.has(s.page.fragmentId);
const currentIndex = () => {
  const i = STOPS.findIndex((s) => !isDone(s));
  return i === -1 ? STOPS.length - 1 : i;
};

// ---- scene / renderer ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x241a12); // warm sandstone dark, not cold green
scene.fog = new THREE.FogExp2(0x241a12, 0.011);

// Phones: portrait screens need a wider FOV or the corridor view is a slit,
// and mobile GPUs can't afford full pixel ratio + point-light shadows.
const IS_TOUCH = isTouchDevice();
const fovFor = () => (innerWidth < innerHeight ? 74 : 58);
const camera = new THREE.PerspectiveCamera(fovFor(), innerWidth / innerHeight, 0.1, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_TOUCH ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = !IS_TOUCH; // cube shadows from the lamp are a phone-killer
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("three-root").appendChild(renderer.domElement);

// cinematic bloom so every glow (diya, tablets, lanterns) reads as light
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), IS_TOUCH ? 0.55 : 0.85, 0.7, 0.8);
composer.addPass(bloom);

// Warm, torch-lit ancient temple (not a cold horror crypt): a soft amber fill
// keeps the space inviting while the Sutradhar's lamp still leads the way.
const ambient = new THREE.AmbientLight(0xffe0b0, 0.52);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0xffcf8a, 0x3a2a18, 0.6);
scene.add(hemi);
const rim = new THREE.DirectionalLight(0xffe6bf, 0.35);
rim.position.set(-10, 20, 8);
scene.add(rim);

// ---- procedural ANCIENT stone: weathered, mossy, faintly carved ----
function makeStoneTexture(r, g, b, opts = {}) {
  const { moss = true, carve = true, strata = true } = opts;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const x = cv.getContext("2d");
  x.fillStyle = `rgb(${r},${g},${b})`;
  x.fillRect(0, 0, 256, 256);
  if (strata) {
    for (let i = 0; i < 26; i++) {
      const y = (i / 26) * 256 + Math.sin(i * 3.7) * 4;
      const d = 0.72 + (i % 3) * 0.12;
      x.fillStyle = `rgba(${(r * d) | 0},${(g * d) | 0},${(b * d) | 0},0.5)`;
      x.fillRect(0, y, 256, 3 + (i % 2));
    }
  }
  // cracks (thin dark meandering lines)
  x.strokeStyle = "rgba(20,16,10,0.5)";
  for (let i = 0; i < 6; i++) {
    x.lineWidth = 1 + Math.random();
    x.beginPath();
    let cx = Math.random() * 256, cy = Math.random() * 256;
    x.moveTo(cx, cy);
    for (let k = 0; k < 6; k++) { cx += (Math.random() - 0.5) * 60; cy += (Math.random() - 0.4) * 50; x.lineTo(cx, cy); }
    x.stroke();
  }
  // faint carved motif (concentric petals — ancient inscription feel)
  if (carve) {
    x.strokeStyle = "rgba(30,24,14,0.35)";
    x.lineWidth = 1.5;
    for (const [ox, oy] of [[64, 64], [192, 192]]) {
      for (let rr = 6; rr < 26; rr += 6) {
        x.beginPath();
        for (let a = 0; a <= 12; a++) { const ang = (a / 12) * Math.PI * 2; const rad = rr + Math.sin(a * 6) * 2; const px = ox + Math.cos(ang) * rad, py = oy + Math.sin(ang) * rad; a ? x.lineTo(px, py) : x.moveTo(px, py); }
        x.stroke();
      }
    }
  }
  // mineral speckle
  for (let i = 0; i < 8000; i++) {
    const v = (Math.random() - 0.5) * 55;
    x.fillStyle = `rgba(${Math.max(0, r + v) | 0},${Math.max(0, g + v) | 0},${Math.max(0, b + v) | 0},0.3)`;
    x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // greenish algae / moss creeping in patches + downward streaks
  if (moss) {
    for (let i = 0; i < 26; i++) {
      const mx = Math.random() * 256, my = Math.random() * 256, rad = 10 + Math.random() * 34;
      const grd = x.createRadialGradient(mx, my, 0, mx, my, rad);
      grd.addColorStop(0, "rgba(60,96,44,0.5)");
      grd.addColorStop(1, "rgba(60,96,44,0)");
      x.fillStyle = grd;
      x.beginPath(); x.arc(mx, my, rad, 0, 7); x.fill();
    }
    for (let i = 0; i < 10; i++) {
      x.fillStyle = "rgba(40,70,40,0.3)";
      x.fillRect(Math.random() * 256, Math.random() * 120, 3 + Math.random() * 4, 60 + Math.random() * 90);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function stoneMat(r, g, b, rep = 1, opts = {}) {
  const map = makeStoneTexture(r, g, b, opts);
  map.repeat.set(rep, rep);
  const bump = makeStoneTexture(r, g, b, { moss: false, carve: true, strata: false });
  bump.repeat.set(rep, rep);
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.7, roughness: 0.96, metalness: 0.03 });
}

// ---- materials ----
// warm carved sandstone (reads beautifully under the warm torch, cool in shadow)
const stone = stoneMat(150, 120, 84, 2);
const stoneDark = stoneMat(120, 96, 66, 2);
const pillarMat = stoneMat(160, 130, 92, 1);
const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.5, metalness: 0.6, emissive: 0x3a2c0a, emissiveIntensity: 0.5 });
const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffb347, emissiveIntensity: 2.2 });
const lanterns = []; // {mesh, phase}

const pillarGeo = new THREE.CylinderGeometry(0.55, 0.68, 11, 12);
const capGeo = new THREE.BoxGeometry(1.6, 0.6, 1.6);
const lanternGeo = new THREE.SphereGeometry(0.36, 12, 12);
const WALLH = 9; // cave wall height

// ---- the cave network (organic graph of chambers + tunnels) ----
const cave = generateCave();
const HUBR = cave.nodes[0].r; // radius of the central hall
const GATE_Z = cave.gateZ; // surface gate sits at the mouth of the entrance corridor
const GAP = 14; // width of the entrance ramp opening
const ENTRY_Y = 11; // surface height; the ramp descends to the cave floor (y=0)
const RAMP_BOT = HUBR; // the ramp meets the hall floor exactly at the hall edge
const GY = ENTRY_Y;
function groundHeightAt(z, x = 0) {
  if (z >= GATE_Z) return ENTRY_Y;
  if (z <= RAMP_BOT) return 0;
  // the raised ramp exists ONLY inside the entrance corridor; chambers that
  // happen to share these z values (south almond/outer ring) are cave floor —
  // without the x check the hero "flew" on an invisible ramp out there
  if (Math.abs(x) > GAP / 2 + 1) return 0;
  return ENTRY_Y * (z - RAMP_BOT) / (GATE_Z - RAMP_BOT);
}
// how deep is the map — used for fog, minimap scale, dust
const MAP_EXTENT = Math.max(...cave.nodes.map((n) => Math.hypot(n.x, n.z))) + 20;

// neighbour directions per chamber (so we can leave openings where tunnels meet)
const neighbourAngles = cave.nodes.map(() => []);
for (const e of cave.edges) {
  const a = cave.nodes[e.a], b = cave.nodes[e.b];
  neighbourAngles[e.a].push(Math.atan2(b.z - a.z, b.x - a.x));
  neighbourAngles[e.b].push(Math.atan2(a.z - b.z, a.x - b.x));
}

// ---- build the cave shell as a few MERGED meshes (one draw call each) ----
const floorParts = [];
const wallParts = [];
const archParts = [];
const angDiff = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
function boxAt(w, h, d, x, y, z, ry) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

// chamber floors (discs) + perimeter walls with openings toward tunnels
for (const n of cave.nodes) {
  const disc = new THREE.CircleGeometry(n.r + 1.5, 40).rotateX(-Math.PI / 2);
  disc.translate(n.x, 0.02, n.z);
  floorParts.push(disc);
  const SEG = n.hub ? 30 : 20;
  const half = Math.asin(Math.min(0.95, (cave.tunnelW + 1.5) / n.r)) + 0.14;
  for (let s = 0; s < SEG; s++) {
    const ang = (s / SEG) * Math.PI * 2;
    // leave a gap where a tunnel (or, at the hub, the entrance) connects
    const skips = neighbourAngles[n.id].slice();
    if (n.hub) skips.push(Math.PI / 2); // entrance faces +Z
    if (skips.some((t) => angDiff(ang, t) < half)) continue;
    const R = n.r + 0.9;
    const wx = n.x + Math.cos(ang) * R, wz = n.z + Math.sin(ang) * R;
    // never wall off the entrance corridor strip
    if (Math.abs(wx) < GAP / 2 + 1 && wz > RAMP_BOT - 1) continue;
    // don't build a wall that lands inside another walkable space (a path)
    if (isWalkable(cave, wx, wz, 0.6)) continue;
    const arc = ((Math.PI * 2) / SEG) * R * 1.15;
    const tang = Math.atan2(-Math.cos(ang), Math.sin(ang)); // wall runs tangentially
    wallParts.push(boxAt(arc, WALLH, 1.4, wx, WALLH / 2, wz, tang));
  }
}

// tunnel floors + side walls + rib arches
for (const e of cave.edges) {
  const a = cave.nodes[e.a], b = cave.nodes[e.b];
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;      // along the tunnel
  const px = -uz, pz = ux;                  // perpendicular
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
  const ry = Math.atan2(-uz, ux);
  floorParts.push(boxAt(len, 0.1, cave.tunnelW * 2, mx, 0.05, mz, ry));
  // walls span ONLY the gap between the two chambers (never intrude into them)
  const s0 = a.r - 1, s1 = len - (b.r - 1);
  const wallLen = s1 - s0;
  if (wallLen > 1) {
    const cs = (s0 + s1) / 2;
    const cx = a.x + ux * cs, cz = a.z + uz * cs;
    for (const side of [-1, 1]) {
      const off = (cave.tunnelW + 0.7) * side;
      const wcx = cx + px * off, wcz = cz + pz * off;
      if (isWalkable(cave, wcx, wcz, 0.6)) continue; // skip walls that fall in a path
      wallParts.push(boxAt(wallLen, WALLH, 1.3, wcx, WALLH / 2, wcz, ry));
    }
    const nribs = Math.max(1, Math.floor(wallLen / 10));
    for (let k = 1; k <= nribs; k++) {
      const s = s0 + (wallLen * k) / (nribs + 1);
      archParts.push(boxAt(cave.tunnelW * 2 + 2.4, 1.1, 1.1, a.x + ux * s, WALLH - 0.4, a.z + uz * s, ry + Math.PI / 2));
    }
  }
}

const caveShell = new THREE.Mesh(mergeGeometries(wallParts), stone);
caveShell.receiveShadow = true;
scene.add(caveShell);
const caveFloor = new THREE.Mesh(mergeGeometries(floorParts), stoneMat(112, 90, 62, 3));
caveFloor.receiveShadow = true;
scene.add(caveFloor);
const caveArches = new THREE.Mesh(mergeGeometries(archParts), stoneDark);
scene.add(caveArches);

// a lantern in most chambers as a warm landmark (emissive; bloom sells the flame)
for (const n of cave.nodes) {
  if (n.hub) continue;
  const lantern = new THREE.Mesh(lanternGeo, lanternMat.clone());
  lantern.position.set(n.x, 4.2, n.z);
  scene.add(lantern);
  lanterns.push({ mesh: lantern, phase: n.id * 0.7 });
}

// carved relief panels (elephants, peacocks, PICTOREAL) at chamber mouths
function makeCarving(kind, seedTxt) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const x = cv.getContext("2d");
  x.fillStyle = "#4c3d26"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { const v = (Math.random() - 0.5) * 40; x.fillStyle = `rgba(${(90 + v) | 0},${(74 + v) | 0},${(48 + v) | 0},0.35)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  x.strokeStyle = "rgba(20,14,6,0.55)"; x.lineWidth = 3; x.strokeRect(10, 10, 236, 236);
  x.save(); x.translate(128, 140); x.strokeStyle = "rgba(22,15,7,0.7)"; x.fillStyle = "rgba(28,20,10,0.55)"; x.lineWidth = 3;
  if (kind === "elephant") {
    x.beginPath();
    x.moveTo(-60, 30); x.quadraticCurveTo(-70, -30, -30, -45); x.quadraticCurveTo(20, -60, 55, -30);
    x.quadraticCurveTo(72, -12, 66, 30); x.lineTo(50, 30); x.lineTo(46, 6); x.lineTo(30, 6); x.lineTo(28, 30);
    x.lineTo(-24, 30); x.lineTo(-26, 6); x.lineTo(-42, 6); x.lineTo(-46, 30); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-60, -20); x.quadraticCurveTo(-92, 0, -78, 42); x.stroke(); // trunk
    x.beginPath(); x.ellipse(-44, -22, 20, 24, 0, 0, 7); x.stroke(); // ear
  } else if (kind === "peacock") {
    x.beginPath(); x.ellipse(0, -6, 58, 46, 0, Math.PI, Math.PI * 2); x.stroke(); // fan
    for (let a = -3; a <= 3; a++) { x.beginPath(); x.moveTo(0, 4); const ax = a * 16; x.lineTo(ax, -52); x.stroke(); x.beginPath(); x.arc(ax, -52, 5, 0, 7); x.fill(); }
    x.beginPath(); x.moveTo(0, 6); x.quadraticCurveTo(10, 34, 4, 54); x.stroke(); // body
    x.beginPath(); x.arc(4, 58, 8, 0, 7); x.stroke(); // head
  } else if (kind === "god") {
    // a seated deity beneath an arched halo (stylised)
    x.beginPath(); x.arc(0, -18, 46, Math.PI, 0); x.stroke(); // halo arch
    for (let r = 8; r <= 22; r += 7) { x.beginPath(); x.arc(0, -40, r, 0, 7); x.stroke(); } // radiant head-halo
    x.beginPath(); x.arc(0, -40, 12, 0, 7); x.fill(); // head
    x.beginPath(); x.moveTo(-26, 46); x.quadraticCurveTo(0, -14, 26, 46); x.closePath(); x.fill(); x.stroke(); // seated body
    x.beginPath(); x.moveTo(-8, -6); x.lineTo(-40, -26); x.moveTo(8, -6); x.lineTo(40, -26); x.stroke(); // raised arms
    x.beginPath(); x.arc(-44, -30, 5, 0, 7); x.arc(44, -30, 5, 0, 7); x.fill(); // hands/lotuses
  } else {
    x.restore(); x.save(); x.translate(128, 128);
    x.textAlign = "center"; x.fillStyle = "rgba(24,16,8,0.8)"; x.font = "bold 40px Georgia";
    x.fillText("PICTOREAL", 0, -6); x.font = "20px Georgia"; x.fillText("· VOL 28 ·", 0, 30);
    x.font = "italic 18px Georgia"; x.fillText(seedTxt || "ANVESHA", 0, 66);
  }
  x.restore();
  const t = new THREE.CanvasTexture(cv);
  return t;
}
const carveKinds = ["elephant", "peacock", "god", "pictoreal"];
const sections = magazine.tiers.map((t) => t.section);
const carveMats = carveKinds.map((k, i) => new THREE.MeshStandardMaterial({ map: makeCarving(k, sections[i % sections.length]), roughness: 0.95, emissive: 0x1a130a, emissiveIntensity: 0.35 }));
const carveGeo = new THREE.PlaneGeometry(3.4, 3.4);
// carved reliefs on chamber walls (elephants, peacocks, gods, the crest)
for (const n of cave.nodes) {
  if (n.hub) continue;
  const base = (neighbourAngles[n.id][0] ?? 0) + Math.PI;
  const panel = new THREE.Mesh(carveGeo, carveMats[n.id % carveMats.length]);
  panel.position.set(n.x + Math.cos(base) * (n.r - 0.15), 3.4, n.z + Math.sin(base) * (n.r - 0.15));
  panel.rotation.y = Math.atan2(-Math.cos(base), -Math.sin(base));
  scene.add(panel);
}
// carved reliefs along the longer tunnel walls too
for (const e of cave.edges) {
  const a = cave.nodes[e.a], b = cave.nodes[e.b];
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len < 30) continue;
  const ux = dx / len, uz = dz / len, px = -uz, pz = ux;
  const s = len * 0.5, cx = a.x + ux * s, cz = a.z + uz * s;
  const side = e.a % 2 ? 1 : -1;
  const off = (cave.tunnelW + 0.2) * side;
  const panel = new THREE.Mesh(carveGeo, carveMats[e.b % carveMats.length]);
  panel.position.set(cx + px * off, 3.4, cz + pz * off);
  panel.rotation.y = Math.atan2(-px * side, -pz * side);
  scene.add(panel);
}

// ---- entrance: open-air terrace + carved gate + a long covered stair descent ----
const sky = new THREE.Mesh(new THREE.SphereGeometry(MAP_EXTENT + 120, 32, 16), new THREE.MeshBasicMaterial({ color: 0x0a1f24, side: THREE.BackSide }));
scene.add(sky);
const terrace = new THREE.Mesh(new THREE.BoxGeometry(52, 2, 30), stoneDark);
terrace.position.set(0, GY - 1, GATE_Z + 13);
terrace.receiveShadow = true;
scene.add(terrace);
for (const [rx, rz, h] of [[-20, GATE_Z + 18, 6], [21, GATE_Z + 10, 4.5], [-24, GATE_Z + 6, 7.5], [17, GATE_Z + 21, 5], [25, GATE_Z + 19, 3.5]]) {
  const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, h, 10), pillarMat);
  rp.position.set(rx, GY + h / 2, rz); rp.rotation.z = (rx % 3 - 1) * 0.06; rp.castShadow = true;
  scene.add(rp);
}

// carved inscription texture (club name + events) — looks engraved in stone
function makeInscription() {
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 512;
  const x = cv.getContext("2d");
  x.fillStyle = "#5b4a30"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const v = (Math.random() - 0.5) * 46;
    x.fillStyle = `rgba(${(96 + v) | 0},${(78 + v) | 0},${(50 + v) | 0},0.4)`;
    x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  x.textAlign = "center"; x.fillStyle = "#26190c"; x.font = "bold 38px Georgia";
  x.fillText(magazine.club.name, 256, 70);
  x.font = "22px Georgia";
  magazine.club.lines.forEach((ln, i) => x.fillText(ln, 256, 135 + i * 40));
  x.fillStyle = "rgba(240,230,210,0.12)"; x.font = "bold 38px Georgia"; x.fillText(magazine.club.name, 255, 69);
  return new THREE.CanvasTexture(cv);
}
const inscriptionMat = new THREE.MeshStandardMaterial({ map: makeInscription(), roughness: 0.95 });
// Saraswati Vandana mural — the goddess of knowledge and the arts blesses the
// descent from the left gate wall (the shloka is part of the artwork).
const saraswatiTex = new THREE.TextureLoader().load("art/saraswati-carving.png");
saraswatiTex.colorSpace = THREE.SRGBColorSpace;
saraswatiTex.anisotropy = 8;
const saraswatiMat = new THREE.MeshStandardMaterial({ map: saraswatiTex, roughness: 0.92 });
const segW = 10;
for (const sgn of [-1, 1]) {
  const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, 13, 2.6), stone);
  seg.position.set(sgn * (GAP / 2 + segW / 2), GY + 6.5, GATE_Z);
  seg.receiveShadow = true; seg.castShadow = true;
  scene.add(seg);
  // left: the Saraswati mural (taller, image is portrait); right: club inscription
  const mural = sgn === -1;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(mural ? 7.6 : segW - 1.5, mural ? 8.5 : 7.5),
    mural ? saraswatiMat : inscriptionMat
  );
  // the mural must sit clear IN FRONT of its trim's face (trim face ends at
  // +1.36) or the gold box hides it
  panel.position.set(sgn * (GAP / 2 + segW / 2), GY + 6.4, GATE_Z + (mural ? 1.42 : 1.35));
  scene.add(panel);
  if (mural) {
    // a slim gold trim so the mural reads as a framed carving, and a soft
    // warm glow washing over the goddess
    const trim = new THREE.Mesh(new THREE.BoxGeometry(8.1, 9.0, 0.12), gold);
    trim.position.set(sgn * (GAP / 2 + segW / 2), GY + 6.4, GATE_Z + 1.3);
    scene.add(trim);
    const glow = new THREE.PointLight(0xffe0b0, 1.6, 14, 2);
    glow.position.set(sgn * (GAP / 2 + segW / 2), GY + 7, GATE_Z + 4.5);
    scene.add(glow);
  }
}
const lintel = new THREE.Mesh(new THREE.BoxGeometry(GAP + segW * 2 + 2, 2.8, 3.2), stone);
lintel.position.set(0, GY + 12, GATE_Z);
scene.add(lintel);
const keystone = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 14), new THREE.MeshStandardMaterial({ color: 0xfcde5a, emissive: 0xfcde5a, emissiveIntensity: 2 }));
keystone.position.set(0, GY + 12, GATE_Z + 1.7); keystone.scale.set(1.8, 1, 0.6);
scene.add(keystone);

const doorMat = new THREE.MeshStandardMaterial({ color: 0x3f2a16, roughness: 0.7, metalness: 0.2 });
function makeDoor(sgn) {
  const pivot = new THREE.Group();
  pivot.position.set(sgn * (GAP / 2), GY, GATE_Z);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(GAP / 2, 10, 0.5), doorMat);
  leaf.position.set(-sgn * (GAP / 4), 5, 0);
  for (let r = 0; r < 4; r++) for (let cc = 0; cc < 2; cc++) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), gold);
    stud.position.set(-sgn * (0.8 + cc * 2.2), 2 + r * 2.2, 0.3);
    leaf.add(stud);
  }
  pivot.add(leaf); scene.add(pivot); return pivot;
}
const doorL = makeDoor(-1);
const doorR = makeDoor(1);
let gateOpen = false;
let gateSwing = 0;

// a clean, smooth ramp down into the hall — no clutter, nothing to bump into.
// the walkable surface exactly matches groundHeightAt so the hero never clips.
const RAMP_DZ = GATE_Z - RAMP_BOT;
const rampSlope = GY / RAMP_DZ;            // y = slope*(z - RAMP_BOT)
const rampTilt = Math.atan2(GY, RAMP_DZ);
// extend the plane above the gate and BELOW the hall floor so its bottom edge is
// buried under the flat hall floor — the join is seamless, nothing to step over
const zTop = GATE_Z + 3, zBot = RAMP_BOT - 12;
const zMid = (zTop + zBot) / 2;
const rampLen = (zTop - zBot) / Math.cos(rampTilt);
const ramp = new THREE.Mesh(new THREE.BoxGeometry(GAP, 0.3, rampLen), stoneMat(120, 96, 66, 3));
ramp.rotation.x = -rampTilt;
ramp.position.set(0, rampSlope * (zMid - RAMP_BOT) - 0.16, zMid);
ramp.receiveShadow = true;
scene.add(ramp);
// low open side walls flanking the ramp (no roof, no steps, nothing to bump)
const corrParts = [];
for (let s = 0; s <= 20; s += 1) {
  const f = s / 20;
  const z = GATE_Z - f * RAMP_DZ;
  const y = GY - f * GY;
  for (const sgn of [-1, 1]) corrParts.push(boxAt(2, WALLH, RAMP_DZ / 20 + 0.4, sgn * (GAP / 2 + 1), y + WALLH / 2 - 1, z, 0));
}
const entranceShell = new THREE.Mesh(mergeGeometries(corrParts), stone);
scene.add(entranceShell);

// solid props the hero must walk AROUND (analytic circles, checked in movement)
const obstacles = [];
// a grand colonnade ringing the hall around the emblem (clear of the entrance)
for (let a = 0; a < 16; a++) {
  const ang = (a / 16) * Math.PI * 2;
  if (angDiff(ang, Math.PI / 2) < 0.42) continue; // gap toward the entrance
  const px = Math.cos(ang) * (HUBR - 6), pz = Math.sin(ang) * (HUBR - 6);
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.set(px, 5.5, pz); pillar.castShadow = true;
  scene.add(pillar);
  const cap = new THREE.Mesh(capGeo, gold);
  cap.position.set(px, 11.1, pz);
  scene.add(cap);
  obstacles.push({ x: px, z: pz, r: 1.5 });
}

// a broad stepped circular dais at the heart of the hall
for (let s = 0; s < 4; s++) {
  const r = 7 - s * 1.4;
  const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.7, 0.5, 48), s % 2 ? stoneDark : stone);
  tier.position.set(0, 0.25 + s * 0.5, 0);
  tier.receiveShadow = true;
  scene.add(tier);
}
obstacles.push({ x: 0, z: 0, r: 7.8 }); // keep the hero off the central dais/emblem
// the Pictoreal crest, floating and glowing above the dais — the FULL badge
// (the old circle-cropped version cut off its border + title text)
const emblem = new THREE.Group();
const logoTex = new THREE.TextureLoader().load("pictoreal-logo.png");
logoTex.colorSpace = THREE.SRGBColorSpace;
logoTex.anisotropy = 8;
// the round crest badge — two faces: the mandala eye on the front, the new
// Pictoreal crest on the back (a circle, so no square / black background shows)
const backTex = new THREE.TextureLoader().load("pictoreal-logo-back.png");
backTex.colorSpace = THREE.SRGBColorSpace;
backTex.anisotropy = 8;
const discGeo = new THREE.CircleGeometry(2.5, 72);
const frontDisc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, alphaTest: 0.12, side: THREE.FrontSide, toneMapped: false }));
frontDisc.position.z = 0.03;
const backDisc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ map: backTex, transparent: true, alphaTest: 0.12, side: THREE.FrontSide, toneMapped: false }));
backDisc.rotation.y = Math.PI; backDisc.position.z = -0.03;
emblem.add(frontDisc, backDisc);
// a slim gold ring that turns slowly around the crest (the moving element)
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.08, 14, 80), new THREE.MeshStandardMaterial({ color: 0xe0b968, emissive: 0xe0b968, emissiveIntensity: 1.3, metalness: 0.8, roughness: 0.28 }));
emblem.add(ring);
// warm halo behind the crest (pulses gently)
const emblemGlow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.14, side: THREE.DoubleSide }));
emblemGlow.position.z = -0.12;
emblem.add(emblemGlow);
emblem.scale.setScalar(1.9); // a large crest that presides over the hall
emblem.position.set(0, 6.8, 0);
scene.add(emblem);
// warm light from the crest, bright enough to read the hall on arrival
const emblemLight = new THREE.PointLight(0xffe0a4, 6, 64, 2);
emblemLight.position.set(0, 6.8, 0);
scene.add(emblemLight);

// ---- route doorways with natural carved-wood signs + wooden direction arrows ----
const compassName = (ang) => {
  const deg = (ang * 180 / Math.PI + 360) % 360; // ang = atan2(z,x): -Z north, +Z south
  return ["East", "South-east", "South", "South-west", "West", "North-west", "North", "North-east"][Math.round(deg / 45) % 8];
};
const roman = (n) => { let s = ""; for (const [v, r] of [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) { s += r; n -= v; } return s; };
const hubRoutes = cave.edges
  .filter((e) => e.a === 0 || e.b === 0)
  .map((e) => { const o = e.a === 0 ? e.b : e.a; const n = cave.nodes[o]; return { ang: Math.atan2(n.z, n.x) }; })
  .sort((p, q) => p.ang - q.ang);

// weathered plank texture (shared base for wooden props)
function makeWoodTex(withText) {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 160;
  const x = cv.getContext("2d");
  x.fillStyle = "#6b4a26"; x.fillRect(0, 0, 256, 160);
  for (let i = 0; i < 46; i++) {
    x.strokeStyle = `rgba(${(44 + Math.random() * 34) | 0},${(28 + Math.random() * 22) | 0},12,0.4)`;
    x.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * 160;
    x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(85, y + (Math.random() - 0.5) * 12, 170, y + (Math.random() - 0.5) * 12, 256, y + (Math.random() - 0.5) * 8); x.stroke();
  }
  for (const kx of [30, 150, 210]) { x.fillStyle = "rgba(30,18,8,0.5)"; x.beginPath(); x.ellipse(kx, 40 + (kx % 60), 5, 8, 0, 0, 7); x.fill(); } // knots
  if (withText) {
    x.strokeStyle = "rgba(28,16,6,0.6)"; x.lineWidth = 8; x.strokeRect(8, 8, 240, 144);
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "bold 74px Georgia";
    x.fillStyle = "rgba(22,12,4,0.85)"; x.fillText(withText.num, 128, 60);   // carved (dark)
    x.fillStyle = "rgba(226,196,138,0.22)"; x.fillText(withText.num, 126, 58); // highlight (depth)
    x.font = "italic 26px Georgia"; x.fillStyle = "#e6d4a4"; x.fillText(withText.label, 128, 122);
  }
  return new THREE.CanvasTexture(cv);
}
const woodMat = new THREE.MeshStandardMaterial({ map: makeWoodTex(), roughness: 0.85, metalness: 0.05 });
const frameMat = stoneMat(150, 120, 84, 1);
// a small carved numeral on transparent ground, for fingerpost arms
function makeArmNumTex(numeral) {
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 64;
  const x = cv.getContext("2d");
  x.textAlign = "center"; x.textBaseline = "middle"; x.font = "bold 44px Georgia";
  x.fillStyle = "rgba(24,14,6,0.9)"; x.fillText(numeral, 64, 34);
  x.fillStyle = "rgba(228,198,140,0.3)"; x.fillText(numeral, 63, 32);
  return new THREE.CanvasTexture(cv);
}

// a small wooden arrow (shaft + head) that points along local -Z (into the tunnel)
function makeWoodArrow() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2.6), woodMat);
  shaft.position.z = -0.3; g.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 4), woodMat);
  head.rotation.x = -Math.PI / 2; head.position.z = -2; g.add(head);
  return g;
}

const routeInfo = [];
hubRoutes.forEach((r, i) => {
  const num = i + 1, label = compassName(r.ang);
  routeInfo.push({ num, label });
  const dir = new THREE.Vector3(Math.cos(r.ang), 0, Math.sin(r.ang));
  const grp = new THREE.Group();
  grp.position.set(dir.x * (HUBR - 1), 0, dir.z * (HUBR - 1));
  grp.rotation.y = Math.atan2(-dir.x, -dir.z); // faces the hall centre; local -Z points into the tunnel
  const opening = cave.tunnelW * 2, jambH = 8.5;
  for (const sx of [-1, 1]) {
    const j = new THREE.Mesh(new THREE.BoxGeometry(2, jambH, 2), frameMat);
    j.position.set(sx * (opening / 2 + 1), jambH / 2, 0); j.castShadow = true; grp.add(j);
  }
  const lin = new THREE.Mesh(new THREE.BoxGeometry(opening + 6, 2.4, 2.2), frameMat);
  lin.position.set(0, jambH + 0.5, 0); grp.add(lin);
  // a carved-wood signboard hung on the lintel by two pegs (lit by the lantern)
  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.8, 0.28), new THREE.MeshStandardMaterial({ map: makeWoodTex({ num: roman(num), label }), roughness: 0.85 }));
  sign.position.set(0, jambH + 0.4, 1.1); grp.add(sign);
  for (const sx of [-1, 1]) { const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), woodMat); peg.position.set(sx * 1.6, jambH + 1.8, 1.0); grp.add(peg); }
  // a wooden arrow above the door pointing into the passage
  const arrow = makeWoodArrow(); arrow.position.set(0, jambH + 2.2, 0.6); arrow.rotation.x = 0.35; grp.add(arrow);
  const lan = new THREE.Mesh(lanternGeo, lanternMat.clone());
  lan.position.set(opening / 2 + 1, jambH - 1.4, 1.4); grp.add(lan); lanterns.push({ mesh: lan, phase: num });
  scene.add(grp);
});

// a wooden fingerpost off to one side of the dais — arms point to each route so
// it guides without ever blocking the logo (full contents are on the I / index key)
const fingerpost = new THREE.Group();
fingerpost.position.set(HUBR * 0.5, 0, HUBR * 0.5);
fingerpost.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 9, 8), woodMat).translateY(4.5));
obstacles.push({ x: HUBR * 0.5, z: HUBR * 0.5, r: 1.1 });
hubRoutes.forEach((r, i) => {
  const g2 = new THREE.Group();
  g2.position.y = 7.4 - i * 0.82;
  g2.rotation.y = -r.ang; // local +X points toward the route
  const arm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.72, 0.24), woodMat);
  arm.position.x = 2.2; g2.add(arm);
  // carved numeral burnt into the plank
  const numTex = makeArmNumTex(roman(i + 1));
  const numPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.62), new THREE.MeshStandardMaterial({ map: numTex, transparent: true, roughness: 0.9 }));
  numPlate.position.set(1.2, 0, 0.13); g2.add(numPlate);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4), woodMat);
  tip.rotation.z = -Math.PI / 2; tip.position.x = 4.2; g2.add(tip);
  fingerpost.add(g2);
});
scene.add(fingerpost);

// the treasure — the assembled artwork — waits at the far end, glowing once
// every page has been uncovered
const chest = new THREE.Group();
chest.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.7), new THREE.MeshStandardMaterial({ color: 0x5f4123, roughness: 0.6 })).translateY(0.7));
for (const bx of [-1.2, 1.2]) chest.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 1.8), gold).translateX(bx).translateY(0.75));
const chestLid = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.7), new THREE.MeshStandardMaterial({ color: 0x74522a, roughness: 0.55 }));
chestLid.geometry.translate(0, 0.3, 0.85);
chestLid.position.set(0, 1.4, -0.85);
chest.add(chestLid);
const chestGlow = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfcde5a, transparent: true, opacity: 0 }));
chestGlow.position.y = 0.9;
chest.add(chestGlow);
// the treasure waits in the deepest chamber (farthest from the hub)
const deepNode = cave.nodes.reduce((best, n) => (Math.hypot(n.x, n.z) > Math.hypot(best.x, best.z) ? n : best), cave.nodes[0]);
chest.position.set(deepNode.x, 0, deepNode.z);
scene.add(chest);

// ---- the Sutradhar: a young turbaned traveller — blue kurta, yellow
// churidar & turban, a leather satchel, sandals; he carries a lamp that is
// the only real light in the dark. Face on the -Z side so he looks at you. ----
const SKIN = new THREE.MeshStandardMaterial({ color: 0xc4895a, roughness: 0.6 });
const KURTA = new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.7 }); // blue kurta
const PANTS = new THREE.MeshStandardMaterial({ color: 0xe6b83a, roughness: 0.7 }); // yellow churidar
const TURBAN_MAT = new THREE.MeshStandardMaterial({ color: 0xf0c341, roughness: 0.7 }); // gold turban
const HAIR_MAT = new THREE.MeshStandardMaterial({ color: 0x241811, roughness: 0.85 });
const LEATHER = new THREE.MeshStandardMaterial({ color: 0x6e4423, roughness: 0.8, metalness: 0.05 });
const SANDAL = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.85 });
const ROBE_MAT = KURTA; // arms match the kurta
const hero = new THREE.Group();

// legs (churidar) + sandals — planted on the floor, don't bob
for (const lx of [-0.25, 0.25]) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 1.6, 10), PANTS);
  leg.position.set(lx, 0.8, 0); leg.castShadow = true; hero.add(leg);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.74), SANDAL);
  foot.position.set(lx, 0.09, 0.14); hero.add(foot);
  const sStrap = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 12), SANDAL);
  sStrap.rotation.x = Math.PI / 2; sStrap.position.set(lx, 0.17, 0.05); hero.add(sStrap);
}

// torso: the blue kurta (a group so it bobs with the walk cycle)
const robe = new THREE.Group();
const kurta = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.68, 1.55, 18), KURTA);
kurta.geometry.translate(0, 0.72, 0); // local 0 = hem, top ~1.5 = shoulders
kurta.castShadow = true; robe.add(kurta);
// a hint of the side slit + kurta hem trim
const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.69, 0.12, 18), new THREE.MeshStandardMaterial({ color: 0x255c93, roughness: 0.7 }));
hem.position.y = 0.06; robe.add(hem);
// mandarin collar
const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.3, 14), KURTA);
collar.position.y = 1.6; robe.add(collar);
hero.add(robe);

// leather satchel on the left hip + a crossbody strap (bob with the torso)
const bag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.3), LEATHER);
bag.position.set(-0.58, 0.6, 0.4); bag.rotation.y = 0.2; robe.add(bag);
const bagFlap = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.34, 0.34), LEATHER);
bagFlap.position.set(-0.58, 0.86, 0.42); bagFlap.rotation.y = 0.2; robe.add(bagFlap);
const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), gold);
buckle.position.set(-0.58, 0.66, 0.58); robe.add(buckle);
const strapBand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.9, 0.06), LEATHER);
strapBand.position.set(-0.02, 1.0, 0.46); strapBand.rotation.z = 0.52; strapBand.rotation.x = -0.05; robe.add(strapBand);

// head + face grouped so they bob together
const headGroup = new THREE.Group();
hero.add(headGroup);
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.3, 10), SKIN);
neck.position.y = 2.02; headGroup.add(neck);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 22), SKIN);
head.position.y = 2.62; head.scale.set(1, 1.08, 0.98); head.castShadow = true;
headGroup.add(head);
for (const ex of [-0.6, 0.6]) {
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), SKIN);
  ear.position.set(ex, 2.58, 0); headGroup.add(ear);
}
// dark curly hair peeking out below the turban (sides + nape)
for (const [hx, hy, hz, s] of [[-0.5, 2.5, 0.1, 0.24], [0.5, 2.5, 0.1, 0.24], [-0.36, 2.5, 0.42, 0.2], [0.36, 2.5, 0.42, 0.2], [0, 2.46, 0.5, 0.22], [-0.3, 2.52, -0.42, 0.24], [0.3, 2.52, -0.42, 0.24]]) {
  const curl = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 8), HAIR_MAT);
  curl.position.set(hx, hy, hz); headGroup.add(curl);
}
// the wrapped gold turban (dome + overlapping wrap bands + a small front fold)
const turban = new THREE.Group();
const tCap = new THREE.Mesh(new THREE.SphereGeometry(0.66, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.8), TURBAN_MAT);
tCap.scale.set(1.08, 0.92, 1.08); turban.add(tCap);
for (const [ty, tilt] of [[-0.02, 0.12], [0.12, -0.05], [0.24, 0.05]]) {
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.15, 10, 24), TURBAN_MAT);
  wrap.rotation.x = Math.PI / 2; wrap.rotation.z = tilt; wrap.position.y = ty; wrap.scale.set(1.05, 1.05, 0.7); turban.add(wrap);
}
const tFold = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8), TURBAN_MAT);
tFold.position.set(0.3, 0.34, -0.1); tFold.rotation.z = -0.5; turban.add(tFold);
turban.position.y = 2.98; headGroup.add(turban);

// big expressive eyes
const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf7f2ea, roughness: 0.35 });
const eyeDark = new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.25 });
const browMat = new THREE.MeshStandardMaterial({ color: 0x1c120a });
for (const ex of [-0.26, 0.26]) {
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), eyeWhite);
  white.position.set(ex, 2.66, -0.5); white.scale.set(0.9, 1.1, 0.6); headGroup.add(white);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), eyeDark);
  pupil.position.set(ex, 2.64, -0.6); headGroup.add(pupil);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  shine.position.set(ex + 0.03, 2.69, -0.66); headGroup.add(shine);
  // thick dark eyebrow
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.1), browMat);
  brow.position.set(ex, 2.86, -0.54); brow.rotation.z = ex < 0 ? 0.16 : -0.16; headGroup.add(brow);
}
// nose + mouth (mouth opens while speaking)
const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), SKIN);
nose.position.set(0, 2.52, -0.66); nose.scale.set(0.8, 1, 1.1); headGroup.add(nose);
const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshStandardMaterial({ color: 0x6a2f2a, roughness: 0.5 }));
mouth.position.set(0, 2.3, -0.58); mouth.scale.set(1.4, 0.35, 0.4); headGroup.add(mouth);

// arms (pivot at shoulder), sleeves match the kurta
const armGeo = new THREE.CylinderGeometry(0.13, 0.11, 1.15, 8);
armGeo.translate(0, -0.57, 0);
const handGeo = new THREE.SphereGeometry(0.12, 10, 10);
const armL = new THREE.Group();
armL.position.set(-0.52, 2.05, 0);
armL.add(new THREE.Mesh(armGeo, KURTA));
armL.add(new THREE.Mesh(handGeo, SKIN).translateY(-1.16));
hero.add(armL);
const armR = new THREE.Group(); // right arm, near the lamp
armR.position.set(0.52, 2.05, -0.1);
armR.add(new THREE.Mesh(armGeo, KURTA));
const handR = new THREE.Mesh(handGeo, SKIN); handR.position.y = -1.16; armR.add(handR);
hero.add(armR);

// the lamp lives on its own rig (not the arm) so it survives if a custom 3D
// model replaces the primitive body — it stays the game's light source.
const lampRig = new THREE.Group();
lampRig.position.set(0.57, 0.9, -0.02);
hero.add(lampRig);
const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.4, metalness: 0.6 }));
handle.position.y = 0.25; lampRig.add(handle);
const lampBowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9c7a34, roughness: 0.4, metalness: 0.6 }));
lampBowl.position.y = -0.02; lampRig.add(lampBowl);
const diya = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.46, 10), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffcf5a, emissiveIntensity: 3.2 }));
diya.position.y = 0.15; lampRig.add(diya);
const diyaGlow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffcf5a, transparent: true, opacity: 0.3 }));
diya.add(diyaGlow);
const lamp = new THREE.PointLight(0xffce6a, 14, 55, 2);
lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024);
diya.add(lamp);
// a soft warm light riding on the head so the face stays readable as it turns
const faceLight = new THREE.PointLight(0xffdca6, 1.6, 5, 2);
faceLight.position.set(0, 2.6, -1.4);
headGroup.add(faceLight);
scene.add(hero);

// ---- optional custom 3D model: drop a rigged file at public/models/sutradhar.glb
// and it replaces the primitive body (keeping the lamp + all game logic). See MODEL.md.
const primitiveBody = [...hero.children].filter((c) => c !== lampRig);
let heroMixer = null;
let heroModel = null; // the loaded GLB body (bobbed procedurally while walking)
let heroModelBaseY = 0;
let heroModelScl = 1; // the loader's fit-to-height scale (squash pulses around it)
new GLTFLoader().load(
  "models/sutradhar.glb",
  (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3(); box.getSize(size);
    const s = 4.2 / (size.y || 1); // scale to ~4.2 units tall
    model.scale.setScalar(s);
    const min = box.min.clone().multiplyScalar(s);
    const c = box.getCenter(new THREE.Vector3()).multiplyScalar(s);
    // -0.2 cancels placeHero()'s hover (tuned for the primitive body) so the
    // sandals actually touch the floor instead of floating
    model.position.set(-c.x, -min.y - 0.2, -c.z);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      // generated GLBs often ship metallic=1, which renders black under point
      // lights (no environment map) — force a matte, lamp-friendly response
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if ("metalness" in m) m.metalness = 0;
        if ("roughness" in m) m.roughness = Math.min(m.roughness ?? 1, 0.9);
      }
    });
    hero.add(model);
    heroModel = model;
    heroModelBaseY = model.position.y;
    heroModelScl = s;
    primitiveBody.forEach((m) => (m.visible = false)); // hide the placeholder body
    // the face light lives on the (now hidden) primitive head — re-hang it on
    // the hero so the model's face and chest stay warmly readable
    hero.add(faceLight);
    faceLight.position.set(0, 3.6, -1.8);
    faceLight.intensity = 1.6; // soft — enough to read the face, not bleach it
    faceLight.distance = 8;
    if (gltf.animations?.length) {
      heroMixer = new THREE.AnimationMixer(model);
      heroMixer.clipAction(gltf.animations[0]).play();
    }
    console.info("Loaded custom Sutradhar model.");
  },
  undefined,
  () => {} // no model present -> keep the primitive Sutradhar
);

// hero roams the floor freely in X/Z; y follows the ground (entrance is raised)
const heroPos = new THREE.Vector3(0, 0, GATE_Z + 8);
let heroFacing = Math.PI; // facing the gate / into the hall
function placeHero() {
  hero.position.set(heroPos.x, groundHeightAt(heroPos.z, heroPos.x) + 0.2, heroPos.z);
}
placeHero();

// ---- page niches (250): the first STOPS are real pages, the rest are sealed
// folios awaiting future volumes. Rendered as instanced plaques that the torch
// reveals from the dark as you approach. ----
const slots = cave.niches.map((nz, i) => ({
  x: nz.x, z: nz.z, angle: nz.angle,
  stop: i < STOPS.length ? STOPS[i] : null,
  sealed: i >= STOPS.length,
  i,
}));
const N_SLOTS = slots.length;
const PLAQUE_Y = 3.1;
const frameGeo = new THREE.BoxGeometry(2.0, 2.8, 0.22);
const panelGeo = new THREE.BoxGeometry(1.55, 2.25, 0.26).translate(0, 0, 0.06);
const pedGeo = new THREE.CylinderGeometry(0.72, 0.98, 2.3, 8);
const frameMesh = new THREE.InstancedMesh(frameGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), N_SLOTS);
const panelMesh = new THREE.InstancedMesh(panelGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), N_SLOTS);
const pedMesh = new THREE.InstancedMesh(pedGeo, pillarMat, N_SLOTS);
pedMesh.receiveShadow = true;
const dummy = new THREE.Object3D();
for (const s of slots) {
  dummy.position.set(s.x, PLAQUE_Y, s.z); dummy.rotation.set(0, s.angle, 0); dummy.updateMatrix();
  frameMesh.setMatrixAt(s.i, dummy.matrix);
  panelMesh.setMatrixAt(s.i, dummy.matrix);
  dummy.position.set(s.x, 1.15, s.z); dummy.updateMatrix();
  pedMesh.setMatrixAt(s.i, dummy.matrix);
}
scene.add(frameMesh, panelMesh, pedMesh);

// Real pages wear their actual cover art on the plaque (192px thumbs), so the
// shelves read as a magazine wall instead of blank parchment. Each cover is
// multiplied from black by the same torch-reveal as its frame; pressing E
// still opens the full-resolution page in the reader.
const coverGeo = new THREE.PlaneGeometry(1.42, 2.05);
const thumbLoader = new THREE.TextureLoader();
const coverMats = []; // slot index -> cover material (only for real pages)
for (const s of slots) {
  if (!s.stop) continue;
  const tex = thumbLoader.load(s.stop.page.surfaceImage.replace("pages/real/", "pages/thumb/"));
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0x000000 });
  const cover = new THREE.Mesh(coverGeo, m);
  cover.position.set(s.x + Math.sin(s.angle) * 0.22, PLAQUE_Y, s.z + Math.cos(s.angle) * 0.22);
  cover.rotation.y = s.angle;
  scene.add(cover);
  coverMats[s.i] = m;
}
const C_WHITE = new THREE.Color(0xffffff);

// reveal palette
const REVEAL = 16;
const C_BLACK = new THREE.Color(0x040c0a);
const C_GOLD = new THREE.Color(0xffd25e);
const C_PARCH = new THREE.Color(0xf4ece0);
const C_DONE = new THREE.Color(0x2f6a4a);
const C_SEAL = new THREE.Color(0x36586a);
const _tc = new THREE.Color();

// ---- dust motes drifting through the caverns ----
const moteCount = 220;
const mgeo = new THREE.BufferGeometry();
const mpos = new Float32Array(moteCount * 3);
for (let i = 0; i < moteCount; i++) {
  mpos[i * 3] = (Math.random() - 0.5) * MAP_EXTENT * 2;
  mpos[i * 3 + 1] = Math.random() * 6;
  mpos[i * 3 + 2] = (Math.random() - 0.5) * MAP_EXTENT * 2;
}
mgeo.setAttribute("position", new THREE.BufferAttribute(mpos, 3));
const motes = new THREE.Points(mgeo, new THREE.PointsMaterial({ color: 0xfcde5a, size: 0.12, transparent: true, opacity: 0.6, depthWrite: false }));
scene.add(motes);

// ---- glowworm ceiling: a slow-breathing star-field above the walls, so
// tilting the camera up reveals a cavern sky instead of empty void ----
const wormCount = 500; // sparse — a quiet night sky, not confetti
const wgeo = new THREE.BufferGeometry();
const wpos = new Float32Array(wormCount * 3);
for (let i = 0; i < wormCount; i++) {
  wpos[i * 3] = (Math.random() - 0.5) * MAP_EXTENT * 2.4;
  wpos[i * 3 + 1] = WALLH + 10 + Math.random() * 12; // high above the walls only
  wpos[i * 3 + 2] = (Math.random() - 0.5) * MAP_EXTENT * 2.4;
}
wgeo.setAttribute("position", new THREE.BufferAttribute(wpos, 3));
const wormMat = new THREE.PointsMaterial({
  color: 0x9fe8d8, // pale glowworm teal
  size: 0.5,
  transparent: true,
  opacity: 0.7,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
scene.add(new THREE.Points(wgeo, wormMat));

// The crown piece overhead: the Pictoreal mandala-eye drawn as a golden
// constellation in the cavern sky above the central hall — look up from the
// emblem and the seal looks back.
const eyePts = [];
const EYE_Y = 26, EYE_RX = 24, EYE_RZ = 12;
for (let i = 0; i < 44; i++) { // almond outline
  const a = (i / 44) * Math.PI * 2;
  eyePts.push(Math.cos(a) * EYE_RX, EYE_Y + Math.sin(a * 2) * 0.8, Math.sin(a) * EYE_RZ);
}
for (let i = 0; i < 20; i++) { // iris ring
  const a = (i / 20) * Math.PI * 2;
  eyePts.push(Math.cos(a) * 7.5, EYE_Y + 0.5, Math.sin(a) * 7.5);
}
for (const [lx, lz] of [[10, -14], [15, -12], [19, -9], [22, -5]]) { // eyelashes
  for (let k = 0; k < 4; k++) eyePts.push(lx * (0.72 + k * 0.11), EYE_Y + k * 0.4, lz * (0.72 + k * 0.11));
}
eyePts.push(0, EYE_Y + 0.5, 0); // the pupil star
const egeo = new THREE.BufferGeometry();
egeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(eyePts), 3));
const eyeMat = new THREE.PointsMaterial({
  color: 0xffe08a, size: 1.05, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
});
scene.add(new THREE.Points(egeo, eyeMat));

// ---- interaction ----
const prompt = document.getElementById("prompt3d");
function nearestSlot() {
  let best = null, bestD = 999;
  for (const s of slots) {
    const d = Math.hypot(s.x - heroPos.x, s.z - heroPos.z);
    if (d < bestD) { bestD = d; best = s; }
  }
  return bestD < 3.8 ? best : null;
}

function openStop(stop) {
  const doOpen = () =>
    openReader(stop.page, () => {
      surfaceFragment(stop.page.fragmentId);
      playFragmentChime();
      flyFragmentToJournal();
      updateHudCount();
    });
  if (stop.firstOfSection && stop.intro && !shownSections.has(stop.tierId)) {
    shownSections.add(stop.tierId);
    narrate([stop.intro], doOpen);
  } else {
    doOpen();
  }
}
const shownSections = new Set();

function flyFragmentToJournal() {
  const flightRoot = document.getElementById("fragment-flight-root");
  const start = document.querySelector(".reader-card")?.getBoundingClientRect();
  const end = getHudJournalButtonRect();
  if (!start || !flightRoot) return;
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

setJumpHandler((pageId) => {
  const slot = slots.find((s) => s.stop && s.stop.page.id === pageId);
  if (!slot) return;
  // stand on the floor in front of the niche, facing it
  heroPos.set(slot.x + Math.sin(slot.angle) * 2.4, 0, slot.z + Math.cos(slot.angle) * 2.4);
  heroFacing = slot.angle + Math.PI;
  placeHero();
  openStop(slot.stop);
});

// ---- opening splash gate ----
let started = false;
let settling = false; // the opening camera swoop, before control is handed over
let enteringHall = false; // scripted stride down through the gate into the hall
let arrived = false; // has the Sutradhar delivered the arrival narration yet
const heroVel = { x: 0, z: 0 }; // smoothed movement velocity
const splash = document.getElementById("splash");
function begin() {
  if (started) return;
  started = true;
  splash.classList.add("gone");
  startAmbientMusic();
  if (SHOWCASE) { startShowcase(); return; }
  // dramatic swoop-in: place the camera high and far; the follow-lerp glides
  // it down to the Sutradhar at the well's mouth while the Sutradhar speaks
  camera.position.set(0, 34, GATE_Z + 60);
  camera.lookAt(0, 4, GATE_Z);
  settling = true;
  setTimeout(() => {
    settling = false;
    // deep link (?page=<id>): fly the visitor straight to the shared page
    if (DEEP_PAGE) { gateOpen = true; arrived = true; jumpToPage(DEEP_PAGE); return; }
    // never speak over the gate verse (one voice at a time, always)
    if (!verseActive && !versePlayed && getSurfacedCount() === 0) narrate(magazine.sutradhar.welcome);
  }, 3000);
}
splash.addEventListener("click", begin);

// the shared "E / Space / tap" action: advance narration, open the gate when
// standing at it, otherwise open the page you're nearest. Used by keyboard,
// canvas tap and the mobile interact button.
function interact() {
  if (!started || settling) return; // no interactions during the opening swoop
  if (isNarrating()) { advanceNarration(); return; }
  if (isAnyOverlayOpen()) return;
  // near the closed gate? first the Modi inscription awakens (once), then the
  // doors swing and the descent begins
  if (!gateOpen && heroPos.z > GATE_Z - 1 && Math.abs(heroPos.x) < GAP) {
    if (!versePlayed) { runGateVerse(); return; }
    openTheGate();
    return;
  }
  const s = nearestSlot();
  if (s && s.stop) openStop(s.stop);
}

function openTheGate() {
  gateOpen = true;
  playDescentRumble();
  narrate(magazine.sutradhar.descend);
  setTimeout(() => { enteringHall = true; }, 1500);
}

// ---- the gate verse: an Akashvani proclamation while the doors grind open.
// No wall of text — the verse rides as a whisper of subtitles while the doors
// swing in slow motion; at the word "अन्वेषा" the title blazes in three
// scripts (Modi above, Devanagari huge, Latin beneath). ----
const VERSE_CAPTIONS = [
  "ज्ञान की राह पर जो बढ़ती रहे,",
  "हर एक रहस्य को वो पढ़ती रहे।",
  "सत्य और मंज़िल की जिसे तलाश है...",
  "...ही उस खोज का प्रकाश है।",
];
let versePlayed = false;
let verseActive = false;
let verseCleanup = null;
let verseStartT = 0; // for the slow cinematic dolly-in

// split into grapheme clusters so matras stay attached to their letters
function graphemes(s) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    return [...new Intl.Segmenter("hi", { granularity: "grapheme" }).segment(s)].map((x) => x.segment);
  }
  return [...s];
}

function runGateVerse() {
  versePlayed = true;
  verseActive = true;
  verseStartT = clock.getElapsedTime();
  gateOpen = true; // the doors begin their slow swing UNDER the proclamation
  stopSpeaking(); // silence any lingering narration — one voice at a time
  playDescentRumble();
  setMusicDucked(true); // the world hushes; only the Akashvani speaks

  const anvesha = graphemes("अन्वेषा")
    .map((g, k) => `<span class="gv-ch" style="animation-delay:${(k * 0.22).toFixed(2)}s">${g}</span>`)
    .join("");
  const el = document.createElement("div");
  el.id = "gate-verse";
  el.innerHTML = `
    <div class="gv-bar gv-top"></div>
    <div class="gv-bar gv-bot"></div>
    <div class="gv-title">
      <div class="gv-modi-word">𑘀𑘡𑘿𑘪𑘹𑘬𑘰</div>
      <div class="gv-anvesha">${anvesha}</div>
      <div class="gv-latin">A&thinsp;N&thinsp;V&thinsp;E&thinsp;S&thinsp;H&thinsp;A</div>
    </div>
    <div class="gv-caption"></div>
    <div class="gv-skip">tap to skip</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("cine")); // letterbox slides in

  const capEl = el.querySelector(".gv-caption");
  const titleEl = el.querySelector(".gv-title");
  const clip = new Audio("voice/gate-verse.mp3");
  let timers = [];
  const schedule = (fn, s) => timers.push(setTimeout(fn, s * 1000));

  // timings ride on the real clip length (fallback 14s), captions in the
  // proportion the verse is recited; the title blazes on the word "अन्वेषा"
  const plan = (T) => {
    const cap = (text, at, hold) => schedule(() => {
      capEl.textContent = text;
      capEl.classList.add("on");
      schedule(() => capEl.classList.remove("on"), hold);
    }, at);
    cap(VERSE_CAPTIONS[0], 0.02 * T, 0.20 * T);
    cap(VERSE_CAPTIONS[1], 0.25 * T, 0.20 * T);
    cap(VERSE_CAPTIONS[2], 0.48 * T, 0.19 * T);
    schedule(() => titleEl.classList.add("blaze"), 0.70 * T); // अन्वेषा...
    cap(VERSE_CAPTIONS[3], 0.80 * T, 0.18 * T);
  };
  clip.addEventListener("loadedmetadata", () => plan(clip.duration || 14));
  clip.play().catch(() => plan(14)); // audio blocked -> run the visuals anyway

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    verseActive = false;
    verseCleanup = null;
    setMusicDucked(false); // music swells back
    timers.forEach(clearTimeout);
    try { clip.pause(); } catch {}
    el.classList.add("gone");
    setTimeout(() => el.remove(), 1000);
    setTimeout(() => { enteringHall = true; }, 500); // stride down; the verse said it all
  };
  verseCleanup = finish;
  el.addEventListener("pointerup", finish); // tap anywhere to skip
  clip.addEventListener("ended", () => setTimeout(finish, 1800)); // hold the title
  setTimeout(finish, 19000); // safety net if audio never fires
}

// keyboard
const keys = {};
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (!started) {
    if (k === " " || k === "enter") begin();
    return;
  }
  if (showcaseMode) { exitShowcase(); return; } // any key hands over control
  if (verseActive) { verseCleanup?.(); return; } // skip the gate verse
  if (settling) return; // the opening swoop ignores all input (prevents the
  // double-Space race that started the gate verse under the welcome lines)
  if (k === " " || k === "enter" || k === "e") interact();
  // quick shortcuts: index / journal / cycle camera angle
  if (!isAnyOverlayOpen()) {
    if (k === "i") openContents();
    if (k === "j") openJournal();
    if (k === "l") applyTheme(!brightMode);
    if (k === "v") cycleCamera();
  }
  if (k === "escape") {
    if (isReaderOpen()) return closeReader();
    if (isContentsOpen()) return closeContents();
    if (isJournalOpen()) return closeJournal();
  }
});
addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

// ---- camera: trails behind the hero down the tunnels; drag / V to override ----
let camYaw = 0; // start behind the hero on the terrace, looking toward the gate
let camPitch = 0.66; // fairly high so it looks down over the walls and shows the way
let CAM_DIST = 12;
const PRESETS = [
  { pitch: 0.66, dist: 12 },  // raised exploration (default) — see over the walls
  { pitch: 0.9, dist: 15 },   // high map-ish look-down
  { pitch: 0.42, dist: 13 },  // low, cinematic over-shoulder
  { pitch: 0.28, dist: 10 },  // near ground
];
let presetIdx = 0;
let manualUntil = 0; // while > clock time, auto-trail is paused (user is steering)
let camDistCur = 12; // smoothed camera boom length

// Mouse-look steering (like a third-person action game): click to capture the
// mouse, then moving it turns the view; WASD moves relative to where you look.
// A plain click when captured opens the page you're standing at.
const ray = new THREE.Raycaster();
let pointerLocked = false;
let down = null;
let dragging = false;

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
});
// Pointer events (NOT mousemove) so drag-to-look works with a finger too —
// touch drags never emit mousemove, which left the camera dead on phones.
window.addEventListener("pointermove", (e) => {
  if (pointerLocked) {
    camYaw -= e.movementX * 0.0022;
    camPitch = Math.max(0.03, Math.min(1.25, camPitch + e.movementY * 0.0022));
    manualUntil = clock.getElapsedTime() + 3.5;
    return;
  }
  if (!down || e.pointerId !== down.id) return; // drag-to-look with the first finger only
  const dx = e.clientX - down.x;
  const dy = e.clientY - down.y;
  if (!dragging && Math.hypot(dx, dy) > 6) dragging = true;
  if (dragging) {
    camYaw -= dx * 0.006;
    camPitch = Math.max(0.03, Math.min(1.25, camPitch + dy * 0.004));
    down = { id: down.id, x: e.clientX, y: e.clientY };
    manualUntil = clock.getElapsedTime() + 3.5;
  }
});
renderer.domElement.addEventListener("pointerdown", (e) => {
  if (down) return; // a second finger doesn't steal the look-drag
  down = { id: e.pointerId, x: e.clientX, y: e.clientY };
  dragging = false;
});
window.addEventListener("pointercancel", () => { down = null; dragging = false; });
renderer.domElement.addEventListener("pointerup", (e) => {
  if (down && e.pointerId !== down.id) return;
  const wasDrag = dragging;
  down = null;
  dragging = false;
  if (showcaseMode) { exitShowcase(); return; } // tap hands over control
  if (verseActive) { verseCleanup?.(); return; } // skip the gate verse
  if (isNarrating()) { advanceNarration(); return; }
  if (isAnyOverlayOpen()) return;
  if (pointerLocked) {
    // captured: a click opens the page you're standing at (crosshair)
    const s = nearestSlot();
    if (s && s.stop) openStop(s.stop);
    return;
  }
  if (wasDrag) return;
  // a clean tap: on touch, open the page you're standing at; on desktop,
  // capture the mouse for first-person-style look.
  if (isTouchDevice()) { if (started) interact(); return; }
  if (started) renderer.domElement.requestPointerLock?.(); // capture the mouse
});

function cycleCamera() {
  presetIdx = (presetIdx + 1) % PRESETS.length;
  camPitch = PRESETS[presetIdx].pitch;
  CAM_DIST = PRESETS[presetIdx].dist;
}

initTouchControls({ onInteract: interact, onCamera: cycleCamera });

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = fovFor(); // rotate phone -> keep the view comfortable
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---- HUD (welcome narration fires from begin() after the splash) ----
mountHud();

// ---- dark (lantern) / bright theme toggle ----
// Default is the warm LANTERN mode: dim + warm so the lamp still leads the way
// and it reads as an ancient temple, not a cold crypt. Toggle to a brighter
// well-lit hall with the 🌙/🔆 button or the L key.
let brightMode = false;
function applyTheme(bright) {
  brightMode = bright;
  ambient.intensity = bright ? 0.52 : 0.3;
  hemi.intensity = bright ? 0.6 : 0.36;
  rim.intensity = bright ? 0.35 : 0.22;
  scene.fog.density = bright ? 0.009 : 0.018;
  const btn = document.getElementById("hud-theme");
  if (btn) btn.textContent = bright ? "🔆" : "🌙";
}
applyTheme(false);
document.getElementById("hud-theme")?.addEventListener("click", () => {
  applyTheme(!brightMode);
  document.querySelector("canvas")?.focus();
});

// ---- SHOWCASE MODE: a looping cinematic auto-flight for the stage ----
// Open the game with ?showcase and tap once: the camera flies itself through
// the gate, orbits the emblem, sweeps a page-lined tunnel, looks up at the
// sky-eye, then pulls back to a title card with the QR — and loops. Any
// key/tap hands control to a live player. Made for the launch projector.
const SHOWCASE = new URLSearchParams(location.search).has("showcase");
const DEEP_PAGE = new URLSearchParams(location.search).get("page"); // ?page=<id> share links
let showcaseMode = false;
let scStart = 0;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SC_SEGS = [
  { dur: 6,  from: V3(0, 26, GATE_Z + 50), to: V3(0, 10, GATE_Z + 14), lookFrom: V3(0, 8, GATE_Z), lookTo: V3(0, 5, GATE_Z - 8),
    cap: "PICTOREAL · VOLUME 28" },
  { dur: 6,  from: V3(0, 9, GATE_Z + 2),  to: V3(0, 5, RAMP_BOT + 6), lookFrom: V3(0, 5, GATE_Z - 20), lookTo: V3(0, 6, 0),
    cap: "अन्वेषा — the seeking" },
  { dur: 11, orbit: { cx: 0, cz: 0, r: 23, h: 7.5, a0: 0.5, a1: 0.5 + Math.PI * 1.5 }, look: V3(0, 6.5, 0),
    cap: "A magazine you can walk through" },
  { dur: 7,  from: V3(10, 4.5, -4), to: V3(74, 5, -2), lookFrom: V3(46, 4, 0), lookTo: V3(92, 4, 0),
    cap: "154 pages hidden in the seeing-eye" },
  { dur: 7,  from: V3(46, 6, 14), to: V3(4, 9, 26), lookFrom: V3(10, 16, 0), lookTo: V3(0, 26, 0),
    cap: "Narrated in three tongues" },
  { dur: 8,  from: V3(0, 16, 34), to: V3(0, 66, 104), lookFrom: V3(0, 8, 0), lookTo: V3(0, 0, 0),
    cap: "Come, seeker — the lamp is lit" },
  { dur: 7,  hold: true, cap: "" }, // title card
];
const SC_TOTAL = SC_SEGS.reduce((a, s) => a + s.dur, 0);
const smooth = (u) => u * u * (3 - 2 * u);

function buildShowcaseUi() {
  const el = document.createElement("div");
  el.id = "showcase-ui";
  el.innerHTML = `
    <div class="sc-caption" id="sc-caption"></div>
    <div class="sc-card" id="sc-card">
      <img class="sc-logo" src="pictoreal-logo.png" alt="Pictoreal" />
      <div class="sc-title">ANVESHA</div>
      <div class="sc-sub">Pictoreal · Volume 28 — an explorable magazine</div>
      <img class="sc-qr" src="qr.png" alt="Scan to explore" />
      <div class="sc-scan">Scan to explore on your phone</div>
    </div>`;
  document.body.appendChild(el);
}

function startShowcase() {
  showcaseMode = true;
  gateOpen = true;
  arrived = true; // no narration pop-ups during the flight
  heroPos.set(0, 0, 12);
  heroFacing = Math.PI; // faces the emblem, back to the gate
  placeHero();
  applyTheme(true);
  scene.fog.density = 0.005; // long, clear sightlines for the flythrough
  document.body.classList.add("showcasing"); // hide HUD/minimap/hints
  buildShowcaseUi();
  scStart = clock.getElapsedTime();
}

function exitShowcase() {
  showcaseMode = false;
  document.getElementById("showcase-ui")?.remove();
  document.body.classList.remove("showcasing");
  applyTheme(false);
  camYaw = 0;
  camPitch = 0.66;
  heroPos.set(0, 0, 12);
  placeHero();
  narrate(magazine.sutradhar.arrive);
}

function runShowcaseCamera(t) {
  let u = (t - scStart) % SC_TOTAL;
  let seg = SC_SEGS[0], segT = 0, idx = 0;
  for (const s of SC_SEGS) { if (u < s.dur) { seg = s; segT = u / s.dur; break; } u -= s.dur; idx++; }
  const k = smooth(segT);
  if (seg.orbit) {
    const o = seg.orbit;
    const a = o.a0 + (o.a1 - o.a0) * k;
    camera.position.set(o.cx + Math.sin(a) * o.r, o.h + Math.sin(k * Math.PI) * 2, o.cz + Math.cos(a) * o.r);
    camera.lookAt(seg.look);
  } else if (!seg.hold) {
    camera.position.lerpVectors(seg.from, seg.to, k);
    const look = new THREE.Vector3().lerpVectors(seg.lookFrom, seg.lookTo, k);
    camera.lookAt(look);
  }
  // captions + the finale card
  const capEl = document.getElementById("sc-caption");
  const cardEl = document.getElementById("sc-card");
  if (capEl && capEl.textContent !== seg.cap) capEl.textContent = seg.cap;
  if (capEl) capEl.classList.toggle("on", !!seg.cap && segT > 0.08 && segT < 0.92);
  if (cardEl) cardEl.classList.toggle("on", !!seg.hold);
}

// ---- minimap ----
const mm = document.getElementById("minimap");
const mmx = mm.getContext("2d");
function drawMinimap() {
  const W = mm.width, R = W / 2, scale = (R - 6) / MAP_EXTENT;
  mmx.clearRect(0, 0, W, W);
  const toXY = (x, z) => [R + x * scale, R + z * scale];
  // chambers (rooms)
  mmx.fillStyle = "rgba(58,92,82,0.5)";
  for (const n of cave.nodes) {
    const [nx, ny] = toXY(n.x, n.z);
    mmx.beginPath(); mmx.arc(nx, ny, Math.max(2, n.r * scale), 0, 7); mmx.fill();
  }
  // tunnels (routes + sub-routes)
  mmx.strokeStyle = "rgba(140,170,158,0.7)"; mmx.lineWidth = 1.5;
  for (const e of cave.edges) {
    const a = cave.nodes[e.a], b = cave.nodes[e.b];
    const [ax, ay] = toXY(a.x, a.z), [bx, by] = toXY(b.x, b.z);
    mmx.beginPath(); mmx.moveTo(ax, ay); mmx.lineTo(bx, by); mmx.stroke();
  }
  // entrance corridor
  const [g0x, g0y] = toXY(0, cave.gateZ), [g1x, g1y] = toXY(0, RAMP_BOT);
  mmx.strokeStyle = "rgba(200,180,120,0.7)";
  mmx.beginPath(); mmx.moveTo(g0x, g0y); mmx.lineTo(g1x, g1y); mmx.stroke();
  // hub emblem
  const [cx, cy] = toXY(0, 0);
  mmx.fillStyle = "#3fd8bf"; mmx.beginPath(); mmx.arc(cx, cy, 4, 0, 7); mmx.fill();
  // Pages: with 200 niches, drawing them all is unreadable noise. Show only
  // the trail of pages already uncovered (small, dim) and a local "radar" of
  // unread pages near the Sutradhar (gold), so the map stays a map.
  const NEAR = 34; // world units of the page radar
  for (const s of slots) {
    if (!s.stop) continue;
    const done = isDone(s.stop);
    const d = Math.hypot(s.x - heroPos.x, s.z - heroPos.z);
    if (!done && d > NEAR) continue;
    const [px, py] = toXY(s.x, s.z);
    mmx.fillStyle = done ? "rgba(127,191,159,0.55)" : "#fcde5a";
    mmx.beginPath(); mmx.arc(px, py, done ? 1.6 : 2.6, 0, 7); mmx.fill();
  }
  // player: pulsing halo + an arrowhead you can spot at a glance
  const [hx, hy] = toXY(heroPos.x, heroPos.z);
  const pulse = 5.5 + Math.sin(performance.now() / 300) * 1.5;
  mmx.fillStyle = "rgba(255,255,255,0.18)";
  mmx.beginPath(); mmx.arc(hx, hy, pulse + 4, 0, 7); mmx.fill();
  const fa = heroFacing;
  const tip = [hx + Math.sin(fa) * 8, hy + Math.cos(fa) * 8];
  const l = [hx + Math.sin(fa + 2.5) * 5, hy + Math.cos(fa + 2.5) * 5];
  const r = [hx + Math.sin(fa - 2.5) * 5, hy + Math.cos(fa - 2.5) * 5];
  mmx.fillStyle = "#ffffff";
  mmx.strokeStyle = "rgba(0,0,0,0.55)"; mmx.lineWidth = 1.5;
  mmx.beginPath(); mmx.moveTo(tip[0], tip[1]); mmx.lineTo(l[0], l[1]); mmx.lineTo(r[0], r[1]); mmx.closePath();
  mmx.fill(); mmx.stroke();
}

// completion watch
let wasReaderOpen = false;
let finished = false;
function checkComplete() {
  if (!isReaderOpen() && wasReaderOpen && isJourneyComplete() && !finished) {
    finished = true;
    setTimeout(() => narrate([magazine.sutradhar.closingComplete], () => openJournal({ animateThread: true })), 400);
  }
  wasReaderOpen = isReaderOpen();
}

// ---- loop ----
const clock = new THREE.Clock();
let nextStep = 0;
function animate() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime; // updated by getDelta()
  if (heroMixer) heroMixer.update(dt);
  const overlay = isAnyOverlayOpen() || !started || settling || showcaseMode || verseActive;
  if (overlay && pointerLocked) document.exitPointerLock();

  // the gate swings open once triggered — in slow, weighty motion that lasts
  // the whole Akashvani verse (the cubic ease-out front-loads motion, so the
  // verse factor is tuned for ~85% eased-open across the 14s recitation),
  // briskly otherwise
  const targetSwing = gateOpen ? 1 : 0;
  gateSwing += (targetSwing - gateSwing) * (verseActive ? 0.00078 : 0.055);
  const swingEased = 1 - Math.pow(1 - gateSwing, 3);
  doorL.rotation.y = swingEased * 2.05;
  doorR.rotation.y = -swingEased * 2.05;
  keystone.material.emissiveIntensity = (gateOpen ? 3.4 : 2) + Math.sin(t * 4) * 0.6;

  let moving = false;

  // scripted stride down through the just-opened gate into the hub
  if (enteringHall) {
    moving = true;
    heroFacing = Math.PI;
    heroPos.x += (0 - heroPos.x) * (1 - Math.pow(0.9, dt * 60));
    heroPos.z -= 16.8 * dt; // world-units per second, not per frame
    placeHero();
    if (heroPos.z < 14) { enteringHall = false; if (!arrived) { arrived = true; setTimeout(() => narrate(magazine.sutradhar.arrive), 500); } }
  } else if (!overlay) {
    const run = keys["shift"] ? 1.7 : 1;
    let f = 0, r = 0;
    if (keys["arrowup"] || keys["w"]) f += 1;
    if (keys["arrowdown"] || keys["s"]) f -= 1;
    if (keys["arrowright"] || keys["d"]) r += 1;
    if (keys["arrowleft"] || keys["a"]) r -= 1;
    f += touchMove.f; r += touchMove.r; // virtual joystick (mobile)
    // desired velocity, camera-relative
    let dvx = 0, dvz = 0;
    if (f || r) {
      const camDir = new THREE.Vector3(hero.position.x - camera.position.x, 0, hero.position.z - camera.position.z);
      if (camDir.lengthSq() < 0.001) camDir.set(0, 0, 1);
      camDir.normalize();
      const right = new THREE.Vector3(-camDir.z, 0, camDir.x);
      const mv = new THREE.Vector3().addScaledVector(camDir, f).addScaledVector(right, r);
      // world-units per SECOND scaled by dt — a 120Hz phone must not run 2x
      // faster than a 60Hz desktop (12/s == the old 0.2/frame at 60fps)
      if (mv.lengthSq() > 0) { mv.normalize(); const spd = 12 * run * dt; dvx = mv.x * spd; dvz = mv.z * spd; }
    }
    // ease velocity toward the target (frame-rate-normalized smoothing)
    const ease = 1 - Math.pow(0.78, dt * 60);
    heroVel.x += (dvx - heroVel.x) * ease;
    heroVel.z += (dvz - heroVel.z) * ease;
    const sp = Math.hypot(heroVel.x, heroVel.z);
    if (sp > 0.004) {
      moving = sp > 0.03;
      if (moving) heroFacing = Math.atan2(heroVel.x, heroVel.z);
      // on the surface terrace roam freely; everywhere below (hall, tunnels AND
      // the entrance corridor) use analytic collision so nothing yanks you around
      if (heroPos.z > GATE_Z - 2) {
        heroPos.x = Math.max(-24, Math.min(24, heroPos.x + heroVel.x));
        // through the open gate the corridor continues down — don't wall it
        // off (this used to clamp at GATE_Z-1 forever, so after climbing back
        // to the terrace you could never descend the stairs again)
        const inMouth = gateOpen && Math.abs(heroPos.x) < GAP / 2 - 1;
        heroPos.z = Math.max(inMouth ? GATE_Z - 3 : GATE_Z - 1, Math.min(GATE_Z + 24, heroPos.z + heroVel.z));
        if (!gateOpen && heroPos.z < GATE_Z + 1.2) heroPos.z = GATE_Z + 1.2;
      } else {
        const next = slideMove(cave, heroPos.x, heroPos.z, heroVel.x, heroVel.z, 0.9);
        if (next.x === heroPos.x) heroVel.x = 0;
        if (next.z === heroPos.z) heroVel.z = 0;
        // push out of solid props (pillars, dais, fingerpost); never into rock
        let nx = next.x, nz = next.z;
        for (const o of obstacles) {
          const dx = nx - o.x, dz = nz - o.z, d = Math.hypot(dx, dz);
          if (d < o.r && d > 0.0001) {
            const px = o.x + (dx / d) * o.r, pz = o.z + (dz / d) * o.r;
            if (isWalkable(cave, px, pz, 0.4)) { nx = px; nz = pz; }
          }
        }
        heroPos.x = nx; heroPos.z = nz;
      }
      placeHero();
    }
  } else {
    heroVel.x = heroVel.z = 0;
  }

  if (moving && t > nextStep) { playFootstep(); nextStep = t + 0.34; }
  const rate = moving ? 6 : 2;
  const bob = Math.abs(Math.sin(t * rate)) * (moving ? 0.12 : 0.05);
  if (heroModel) {
    // Static GLB body (no skeleton), so sell the walk the stylized-game way:
    // a springy step-hop, a forward lean into travel, a step-synced roll that
    // reads as weight shifting between feet, and a faint breathing sway at rest.
    const stride = Math.sin(t * rate);
    if (moving) {
      // grounded stride: heels never leave the floor by more than a step's rise
      heroModel.position.y = heroModelBaseY + Math.abs(stride) * 0.07;
      heroModel.rotation.x = 0.04;                                      // slight lean in
      heroModel.rotation.z = stride * 0.055;                            // foot-to-foot roll
      const squash = 1 - Math.abs(Math.cos(t * rate)) * 0.02;           // landing squash
      heroModel.scale.y = heroModelScl * squash;
      heroModel.scale.x = heroModel.scale.z = heroModelScl * (2 - squash);
    } else {
      heroModel.position.y = heroModelBaseY + bob * 0.3;
      heroModel.rotation.x += (0 - heroModel.rotation.x) * 0.1;         // settle upright
      heroModel.rotation.z = Math.sin(t * 1.2) * 0.014;                 // breathing sway
      heroModel.scale.setScalar(heroModelScl);
    }
  }
  robe.position.y = 1.0 + bob;
  headGroup.position.y = bob;
  armL.rotation.x = Math.sin(t * rate) * (moving ? 0.4 : 0.12);
  armR.rotation.x = -0.5 + Math.sin(t * rate) * 0.1; // right arm holds the torch out
  // turn to face the direction of travel
  let dyaw = heroFacing - hero.rotation.y;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  hero.rotation.y += dyaw * 0.15;
  // turn the head so the Sutradhar's face stays toward the camera (its guide
  // looks back at the seeker). The face is on the head's -Z side, so the head
  // world-yaw that points the face at the camera is (angToCam - PI).
  const angToCam = Math.atan2(camera.position.x - hero.position.x, camera.position.z - hero.position.z);
  let hyaw = angToCam - Math.PI - hero.rotation.y;
  while (hyaw > Math.PI) hyaw -= Math.PI * 2;
  while (hyaw < -Math.PI) hyaw += Math.PI * 2;
  hyaw = Math.max(-1.3, Math.min(1.3, hyaw)); // clamp so the neck doesn't over-twist
  headGroup.rotation.y += (hyaw - headGroup.rotation.y) * 0.12;
  lamp.intensity = 14 + Math.sin(t * 12) * 1.8;
  diyaGlow.scale.setScalar(1 + Math.sin(t * 10) * 0.18);
  wormMat.opacity = 0.55 + Math.sin(t * 0.7) * 0.18; // glowworms breathe slowly
  eyeMat.opacity = 0.75 + Math.sin(t * 0.9) * 0.2; // the sky-eye shimmers
  // the emblem grows brighter as the seeker uncovers the magazine
  const scProgress = getSurfacedCount() / getTotalFragments();
  emblemLight.intensity = 6 + scProgress * 9 + Math.sin(t * 2.2) * 0.5;
  // mouth moves while the Sutradhar speaks
  const talk = isSpeaking();
  mouth.scale.y = talk ? 0.35 + Math.abs(Math.sin(t * 18)) * 0.9 : 0.35;

  // lantern flicker (bloom makes these read as real flame)
  for (const l of lanterns) {
    l.mesh.material.emissiveIntensity = 1.8 + Math.sin(t * 8 + l.phase) * 0.5 + Math.sin(t * 23 + l.phase) * 0.2;
  }
  // the crest faces the entrance and breathes; its gold ring turns slowly
  emblem.rotation.y = Math.sin(t * 0.35) * 0.22; // gentle sway, logo stays readable
  emblem.position.y = 6.8 + Math.sin(t * 1.1) * 0.22;
  ring.rotation.z = t * 0.5;
  emblemGlow.material.opacity = 0.13 + Math.abs(Math.sin(t * 1.3)) * 0.1;
  emblemGlow.scale.setScalar(1 + Math.sin(t * 1.3) * 0.05);

  // the hall warms as more of it is uncovered (bright amber -> deep sandstone)
  const depth = 1 - getSurfacedCount() / Math.max(1, STOPS.length);
  const fogC = new THREE.Color(0x3a2c1a).lerp(new THREE.Color(0x1e150d), depth);
  scene.fog.color.copy(fogC);
  scene.background.copy(fogC);

  // treasure chest wakes up once every page is uncovered
  if (isJourneyComplete()) {
    chestGlow.material.opacity = 0.25 + Math.abs(Math.sin(t * 2)) * 0.25;
    chestLid.rotation.x = Math.max(chestLid.rotation.x - 0.02, -1.1);
  }

  // every niche hides in the dark and is REVEALED by the torch as you near it
  // (in showcase mode the whole gallery glows for the flythrough)
  for (const s of slots) {
    const d = Math.hypot(s.x - heroPos.x, s.z - heroPos.z);
    const prox = showcaseMode ? 1 : Math.max(0, Math.min(1, 1 - d / REVEAL));
    let frameBase, panelBase, gain;
    if (s.sealed) { frameBase = C_SEAL; panelBase = C_SEAL; gain = 0.45; }
    else if (isDone(s.stop)) { frameBase = C_GOLD; panelBase = C_DONE; gain = 1; }
    else { const pulse = 0.6 + 0.4 * Math.sin(t * 3 + s.i); frameBase = C_GOLD; panelBase = C_PARCH; gain = pulse; }
    _tc.copy(C_BLACK).lerp(frameBase, prox * gain);
    frameMesh.setColorAt(s.i, _tc);
    _tc.copy(C_BLACK).lerp(panelBase, prox * gain);
    panelMesh.setColorAt(s.i, _tc);
    // the page's cover art fades in with the same torchlight (capped in
    // showcase so fully-lit covers don't blow out under bloom)
    const cm = coverMats[s.i];
    if (cm) {
      const g = showcaseMode ? 0.8 : isDone(s.stop) ? 1 : 0.75 + 0.25 * Math.sin(t * 3 + s.i);
      cm.color.copy(C_BLACK).lerp(C_WHITE, prox * g);
    }
  }
  frameMesh.instanceColor.needsUpdate = true;
  panelMesh.instanceColor.needsUpdate = true;

  // motes drift up
  const p = motes.geometry.attributes.position.array;
  for (let i = 0; i < moteCount; i++) {
    p[i * 3 + 1] += 0.015;
    if (p[i * 3 + 1] > 8) p[i * 3 + 1] = 0;
  }
  motes.geometry.attributes.position.needsUpdate = true;

  if (showcaseMode) {
    runShowcaseCamera(t); // the stage flythrough owns the camera
  } else if (verseActive) {
    // cinematic gate shot: level with the seeker so the darkness shows
    // through the widening doors (not the floor), with a slow dolly-in
    const prog = Math.min(1, (t - verseStartT) / 14);
    const gy = groundHeightAt(heroPos.z, heroPos.x);
    const eye = new THREE.Vector3(heroPos.x * 0.3, gy + 4.3, GATE_Z + 14.5 - prog * 5);
    camera.position.lerp(eye, 0.05);
    camera.lookAt(0, gy + 3.9, GATE_Z - 5);
  } else {
  // third-person camera: trails behind the hero unless the player is steering
  if (t > manualUntil && moving) {
    let target = heroFacing + Math.PI;
    let d = target - camYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    camYaw += d * 0.05;
  }
  const cp = Math.max(0.12, Math.min(1.15, camPitch));
  const dirx = Math.sin(camYaw) * Math.cos(cp);
  const dirz = Math.cos(camYaw) * Math.cos(cp);
  // the camera rides high enough to look over the cave walls; only when a low
  // angle would bury it in the rock do we pull the boom in
  const camHeight = Math.sin(cp) * CAM_DIST + 2.6;
  let want = CAM_DIST;
  if (heroPos.z < RAMP_BOT && camHeight < WALLH + 1.5) {
    want = 3;
    for (let dd = CAM_DIST; dd >= 3; dd -= 0.5) {
      if (isWalkable(cave, hero.position.x + dirx * dd, hero.position.z + dirz * dd, 0.2)) { want = dd; break; }
    }
  }
  camDistCur += (want - camDistCur) * (want < camDistCur ? 0.5 : 0.08);
  const dist = camDistCur;
  const ox = dirx * dist;
  const oy = Math.sin(cp) * dist + 2.6 + (CAM_DIST - dist) * 0.35;
  const oz = dirz * dist;
  const desired = new THREE.Vector3(hero.position.x + ox, hero.position.y + oy, hero.position.z + oz);
  camera.position.lerp(desired, settling ? 0.02 : 0.12);
  camera.lookAt(hero.position.x - Math.sin(heroFacing) * 2, hero.position.y + 1.6, hero.position.z - Math.cos(heroFacing) * 2);
  }

  // proximity prompt
  if (!overlay) {
    const near = nearestSlot();
    if (near && near.stop) { prompt.textContent = "Press E to open · " + near.stop.page.title; prompt.style.opacity = "1"; }
    else if (near) { prompt.textContent = "A sealed folio — awaiting a future volume"; prompt.style.opacity = "1"; }
    else { prompt.style.opacity = "0"; }
  } else {
    prompt.style.opacity = "0";
  }

  checkComplete();
  drawMinimap();
  composer.render();
  requestAnimationFrame(animate);
}
animate();

// world built — flip the splash from "loading" to the real prompt (kind to
// event crowds on slow venue Wi-Fi: the button appears only when it will work)
const promptEl = document.getElementById("splash-prompt");
if (promptEl) promptEl.textContent = SHOWCASE ? "Tap to begin the showcase" : "Tap or press Space to begin the Anvesha";
