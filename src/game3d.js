import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { generateCave, isWalkable, slideMove } from "./world/cave.js";
import gsap from "gsap";
import { magazine } from "./content/magazine.config.js";
import { state } from "./state.js";
import { surfaceFragment, isJourneyComplete, getSurfacedCount } from "./systems/fragments.js";
import { playFragmentChime, playFootstep, startAmbientMusic, playDescentRumble } from "./systems/audio.js";
import { openReader, isReaderOpen, closeReader } from "./ui/reader.js";
import { openJournal, isJournalOpen, closeJournal } from "./ui/journal.js";
import { openContents, isContentsOpen, closeContents, setJumpHandler } from "./ui/contents.js";
import { narrate, advanceNarration, isNarrating } from "./ui/narration.js";
import { mountHud, updateHudCount, getHudJournalButtonRect } from "./ui/hud.js";
import { isAnyOverlayOpen } from "./ui/overlays.js";
import { isSpeaking } from "./systems/voice.js";

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
scene.background = new THREE.Color(0x06201b);
scene.fog = new THREE.FogExp2(0x06201b, 0.014);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("three-root").appendChild(renderer.domElement);

// cinematic bloom so every glow (diya, tablets, lanterns) reads as light
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.7, 0.8);
composer.addPass(bloom);

// Dark world: only a whisper of fill so the Sutradhar's torch is the light
// that reveals the space and the hidden pages as you move.
const ambient = new THREE.AmbientLight(0x2a6f63, 0.34);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x36786a, 0x08120e, 0.4);
scene.add(hemi);
const rim = new THREE.DirectionalLight(0x8fd8c8, 0.1);
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
function groundHeightAt(z) {
  if (z >= GATE_Z) return ENTRY_Y;
  if (z <= RAMP_BOT) return 0;
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
      wallParts.push(boxAt(wallLen, WALLH, 1.3, cx + px * off, WALLH / 2, cz + pz * off, ry));
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
const segW = 10;
for (const sgn of [-1, 1]) {
  const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, 13, 2.6), stone);
  seg.position.set(sgn * (GAP / 2 + segW / 2), GY + 6.5, GATE_Z);
  seg.receiveShadow = true; seg.castShadow = true;
  scene.add(seg);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(segW - 1.5, 7.5), inscriptionMat);
  panel.position.set(sgn * (GAP / 2 + segW / 2), GY + 6.5, GATE_Z + 1.35);
  scene.add(panel);
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
obstacles.push({ x: 0, z: 0, r: 6.5 }); // keep the hero off the central dais/emblem
// the 3D Pictoreal logo emblem, rotating and glowing above the dais
const emblem = new THREE.Group();
const logoTex = new THREE.TextureLoader().load("/pictoreal-logo.png");
logoTex.colorSpace = THREE.SRGBColorSpace;
const emblemDisc = new THREE.Mesh(
  new THREE.CircleGeometry(2.3, 48),
  new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
);
const emblemBack = new THREE.Mesh(
  new THREE.CircleGeometry(2.3, 48),
  new THREE.MeshBasicMaterial({ map: logoTex, transparent: true })
);
emblemBack.rotation.y = Math.PI;
emblem.add(emblemDisc, emblemBack);
// a gold ring frame + glow behind
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.12, 12, 48), new THREE.MeshStandardMaterial({ color: 0xc9a24b, emissive: 0xc9a24b, emissiveIntensity: 1.2, metalness: 0.7, roughness: 0.3 }));
emblem.add(ring);
const emblemGlow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), new THREE.MeshBasicMaterial({ color: 0x1f8f7c, transparent: true, opacity: 0.18 }));
emblemGlow.position.z = -0.1;
emblem.add(emblemGlow);
emblem.scale.setScalar(2.3); // a large glowing eye that dominates the hall
emblem.position.set(0, 8, 0);
scene.add(emblem);
// teal light from the emblem, bright enough to read the hall on arrival
const emblemLight = new THREE.PointLight(0x5fe8cf, 6, 60, 2);
emblemLight.position.set(0, 8, 0);
scene.add(emblemLight);
// a shaft of light tying the eye to the dais below
const emblemBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 2.6, 9, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x3fd8bf, transparent: true, opacity: 0.07, side: THREE.DoubleSide }));
emblemBeam.position.set(0, 4, 0);
scene.add(emblemBeam);

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
const armR = new THREE.Group(); // holds the lamp
armR.position.set(0.52, 2.05, -0.1);
armR.add(new THREE.Mesh(armGeo, KURTA));
const handR = new THREE.Mesh(handGeo, SKIN); handR.position.y = -1.16; armR.add(handR);
hero.add(armR);

// the lamp: a small brass oil lamp with a bright flame — the light source
const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.4, metalness: 0.6 }));
handle.position.set(0.05, -1.05, 0.12); armR.add(handle);
const lampBowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9c7a34, roughness: 0.4, metalness: 0.6 }));
lampBowl.position.set(0.05, -1.32, 0.12); armR.add(lampBowl);
const diya = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.46, 10), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffcf5a, emissiveIntensity: 3.2 }));
diya.position.set(0.05, -1.15, 0.12); armR.add(diya);
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

// hero roams the floor freely in X/Z; y follows the ground (entrance is raised)
const heroPos = new THREE.Vector3(0, 0, GATE_Z + 8);
let heroFacing = Math.PI; // facing the gate / into the hall
function placeHero() {
  hero.position.set(heroPos.x, groundHeightAt(heroPos.z) + 0.2, heroPos.z);
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
  // dramatic swoop-in: place the camera high and far; the follow-lerp glides
  // it down to the Sutradhar at the well's mouth while the Sutradhar speaks
  camera.position.set(0, 34, GATE_Z + 60);
  camera.lookAt(0, 4, GATE_Z);
  settling = true;
  setTimeout(() => {
    settling = false;
    if (getSurfacedCount() === 0) narrate(magazine.sutradhar.welcome);
  }, 3000);
}
splash.addEventListener("click", begin);

// keyboard
const keys = {};
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (!started) {
    if (k === " " || k === "enter") begin();
    return;
  }
  if (k === " " || k === "enter" || k === "e") {
    if (isNarrating()) { advanceNarration(); return; }
    if (isAnyOverlayOpen()) return;
    // near the closed gate? open it, let the doors swing, then stride down
    if (!gateOpen && heroPos.z > GATE_Z - 1 && Math.abs(heroPos.x) < GAP) {
      gateOpen = true;
      playDescentRumble();
      narrate(magazine.sutradhar.descend);
      // begin the descent once the doors have swung open
      setTimeout(() => { enteringHall = true; }, 1500);
      return;
    }
    const s = nearestSlot();
    if (s && s.stop) openStop(s.stop);
  }
  // quick shortcuts: index / journal / cycle camera angle
  if (!isAnyOverlayOpen()) {
    if (k === "i") openContents();
    if (k === "j") openJournal();
    if (k === "v") {
      presetIdx = (presetIdx + 1) % PRESETS.length;
      camPitch = PRESETS[presetIdx].pitch;
      CAM_DIST = PRESETS[presetIdx].dist;
    }
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
window.addEventListener("mousemove", (e) => {
  if (pointerLocked) {
    camYaw -= e.movementX * 0.0022;
    camPitch = Math.max(0.14, Math.min(1.25, camPitch + e.movementY * 0.0022));
    manualUntil = clock.getElapsedTime() + 3.5;
    return;
  }
  if (!down) return; // fallback drag-to-look when not captured
  const dx = e.clientX - down.x;
  const dy = e.clientY - down.y;
  if (!dragging && Math.hypot(dx, dy) > 6) dragging = true;
  if (dragging) {
    camYaw -= dx * 0.006;
    camPitch = Math.max(0.14, Math.min(1.25, camPitch + dy * 0.004));
    down = { x: e.clientX, y: e.clientY };
    manualUntil = clock.getElapsedTime() + 3.5;
  }
});
renderer.domElement.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; dragging = false; });
renderer.domElement.addEventListener("pointerup", () => {
  const wasDrag = dragging;
  down = null;
  dragging = false;
  if (isNarrating()) { advanceNarration(); return; }
  if (isAnyOverlayOpen()) return;
  if (pointerLocked) {
    // captured: a click opens the page you're standing at (crosshair)
    const s = nearestSlot();
    if (s && s.stop) openStop(s.stop);
    return;
  }
  if (wasDrag) return;
  if (started) renderer.domElement.requestPointerLock?.(); // capture the mouse
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---- HUD (welcome narration fires from begin() after the splash) ----
mountHud();

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
  // real pages
  for (const s of slots) {
    if (!s.stop) continue;
    const [px, py] = toXY(s.x, s.z);
    mmx.fillStyle = isDone(s.stop) ? "#7fbf9f" : "#fcde5a";
    mmx.beginPath(); mmx.arc(px, py, 3, 0, 7); mmx.fill();
  }
  // player + facing
  const [hx, hy] = toXY(heroPos.x, heroPos.z);
  mmx.strokeStyle = "#ffffff"; mmx.lineWidth = 2;
  mmx.beginPath(); mmx.moveTo(hx, hy); mmx.lineTo(hx + Math.sin(heroFacing) * 9, hy + Math.cos(heroFacing) * 9); mmx.stroke();
  mmx.fillStyle = "#ffffff";
  mmx.beginPath(); mmx.arc(hx, hy, 3, 0, 7); mmx.fill();
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
  const t = clock.getElapsedTime();
  const overlay = isAnyOverlayOpen() || !started || settling;
  if (overlay && pointerLocked) document.exitPointerLock();

  // the gate swings open once triggered
  // the great doors swing open with weight (ease-out) once triggered
  const targetSwing = gateOpen ? 1 : 0;
  gateSwing += (targetSwing - gateSwing) * 0.055;
  const swingEased = 1 - Math.pow(1 - gateSwing, 3);
  doorL.rotation.y = swingEased * 2.05;
  doorR.rotation.y = -swingEased * 2.05;
  keystone.material.emissiveIntensity = (gateOpen ? 3.4 : 2) + Math.sin(t * 4) * 0.6;

  let moving = false;

  // scripted stride down through the just-opened gate into the hub
  if (enteringHall) {
    moving = true;
    heroFacing = Math.PI;
    heroPos.x += (0 - heroPos.x) * 0.1;
    heroPos.z -= 0.28;
    placeHero();
    if (heroPos.z < 14) { enteringHall = false; if (!arrived) { arrived = true; setTimeout(() => narrate(magazine.sutradhar.arrive), 500); } }
  } else if (!overlay) {
    const run = keys["shift"] ? 1.7 : 1;
    let f = 0, r = 0;
    if (keys["arrowup"] || keys["w"]) f += 1;
    if (keys["arrowdown"] || keys["s"]) f -= 1;
    if (keys["arrowright"] || keys["d"]) r += 1;
    if (keys["arrowleft"] || keys["a"]) r -= 1;
    // desired velocity, camera-relative
    let dvx = 0, dvz = 0;
    if (f || r) {
      const camDir = new THREE.Vector3(hero.position.x - camera.position.x, 0, hero.position.z - camera.position.z);
      if (camDir.lengthSq() < 0.001) camDir.set(0, 0, 1);
      camDir.normalize();
      const right = new THREE.Vector3(-camDir.z, 0, camDir.x);
      const mv = new THREE.Vector3().addScaledVector(camDir, f).addScaledVector(right, r);
      if (mv.lengthSq() > 0) { mv.normalize(); const spd = 0.2 * run; dvx = mv.x * spd; dvz = mv.z * spd; }
    }
    // ease velocity toward the target for smooth starts, stops and turns
    heroVel.x += (dvx - heroVel.x) * 0.22;
    heroVel.z += (dvz - heroVel.z) * 0.22;
    const sp = Math.hypot(heroVel.x, heroVel.z);
    if (sp > 0.004) {
      moving = sp > 0.03;
      if (moving) heroFacing = Math.atan2(heroVel.x, heroVel.z);
      // above ground roam freely; underground the walls are solid (slide along)
      if (heroPos.z > GATE_Z - 2) {
        heroPos.x = Math.max(-24, Math.min(24, heroPos.x + heroVel.x));
        heroPos.z = Math.max(GATE_Z - 1, Math.min(GATE_Z + 24, heroPos.z + heroVel.z));
        if (!gateOpen && heroPos.z < GATE_Z + 1.2) heroPos.z = GATE_Z + 1.2;
      } else if (heroPos.z > RAMP_BOT - 1) {
        heroPos.x = Math.max(-GAP / 2 + 1, Math.min(GAP / 2 - 1, heroPos.x + heroVel.x));
        heroPos.z += heroVel.z;
      } else {
        const next = slideMove(cave, heroPos.x, heroPos.z, heroVel.x, heroVel.z, 0.9);
        // kill the velocity component into a wall so we don't stutter against it
        if (next.x === heroPos.x) heroVel.x = 0;
        if (next.z === heroPos.z) heroVel.z = 0;
        // push out of solid props (pillars, dais, fingerpost) so we can't clip through
        let nx = next.x, nz = next.z;
        for (const o of obstacles) {
          const dx = nx - o.x, dz = nz - o.z, d = Math.hypot(dx, dz);
          if (d < o.r && d > 0.0001) { nx = o.x + (dx / d) * o.r; nz = o.z + (dz / d) * o.r; }
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
  // mouth moves while the Sutradhar speaks
  const talk = isSpeaking();
  mouth.scale.y = talk ? 0.35 + Math.abs(Math.sin(t * 18)) * 0.9 : 0.35;

  // lantern flicker (bloom makes these read as real flame)
  for (const l of lanterns) {
    l.mesh.material.emissiveIntensity = 1.8 + Math.sin(t * 8 + l.phase) * 0.5 + Math.sin(t * 23 + l.phase) * 0.2;
  }
  // the central emblem turns slowly and breathes
  emblem.rotation.y = Math.sin(t * 0.4) * 0.28; // sways gently, logo faces the entrance
  emblem.position.y = 8 + Math.sin(t * 1.1) * 0.25;
  emblemGlow.material.opacity = 0.14 + Math.abs(Math.sin(t * 1.5)) * 0.1;

  // the vault brightens a little as more of it is uncovered
  const depth = 1 - getSurfacedCount() / Math.max(1, STOPS.length);
  const fogC = new THREE.Color(0x0a2620).lerp(new THREE.Color(0x05120f), depth);
  scene.fog.color.copy(fogC);
  scene.background.copy(fogC);

  // treasure chest wakes up once every page is uncovered
  if (isJourneyComplete()) {
    chestGlow.material.opacity = 0.25 + Math.abs(Math.sin(t * 2)) * 0.25;
    chestLid.rotation.x = Math.max(chestLid.rotation.x - 0.02, -1.1);
  }

  // every niche hides in the dark and is REVEALED by the torch as you near it
  for (const s of slots) {
    const d = Math.hypot(s.x - heroPos.x, s.z - heroPos.z);
    const prox = Math.max(0, Math.min(1, 1 - d / REVEAL));
    let frameBase, panelBase, gain;
    if (s.sealed) { frameBase = C_SEAL; panelBase = C_SEAL; gain = 0.45; }
    else if (isDone(s.stop)) { frameBase = C_GOLD; panelBase = C_DONE; gain = 1; }
    else { const pulse = 0.6 + 0.4 * Math.sin(t * 3 + s.i); frameBase = C_GOLD; panelBase = C_PARCH; gain = pulse; }
    _tc.copy(C_BLACK).lerp(frameBase, prox * gain);
    frameMesh.setColorAt(s.i, _tc);
    _tc.copy(C_BLACK).lerp(panelBase, prox * gain);
    panelMesh.setColorAt(s.i, _tc);
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
