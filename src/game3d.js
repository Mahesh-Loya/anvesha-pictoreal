import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
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

// ---- procedural stone textures (canvas) so surfaces look carved, not flat ----
function makeStoneTexture(r, g, b, strata = true) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const x = cv.getContext("2d");
  x.fillStyle = `rgb(${r},${g},${b})`;
  x.fillRect(0, 0, 256, 256);
  if (strata) {
    for (let i = 0; i < 26; i++) {
      const y = (i / 26) * 256 + (Math.sin(i * 3.7) * 4);
      const d = 0.75 + (i % 3) * 0.12;
      x.fillStyle = `rgba(${r * d | 0},${g * d | 0},${b * d | 0},0.5)`;
      x.fillRect(0, y, 256, 3 + (i % 2));
    }
  }
  // mineral speckle
  for (let i = 0; i < 9000; i++) {
    const px = Math.random() * 256, py = Math.random() * 256;
    const v = (Math.random() - 0.5) * 60;
    x.fillStyle = `rgba(${Math.max(0, r + v) | 0},${Math.max(0, g + v) | 0},${Math.max(0, b + v) | 0},0.35)`;
    x.fillRect(px, py, 2, 2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function stoneMat(r, g, b, rep = 1) {
  const map = makeStoneTexture(r, g, b);
  map.repeat.set(rep, rep);
  const bump = makeStoneTexture(r, g, b, false);
  bump.repeat.set(rep, rep);
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 0.6, roughness: 0.95, metalness: 0.03 });
}

// ---- descent path helpers ----
const STEP_Y = 3.2; // how far each stop drops
const STEP_Z = 5.5; // how far each stop recedes
const SIDE = 4.2; // tablet offset to the side of the path
function pathAt(p) {
  return new THREE.Vector3(0, -p * STEP_Y, p * STEP_Z);
}

// ---- stepwell geometry along the path ----
// warm carved sandstone (reads beautifully under the warm torch, cool in shadow)
const stone = stoneMat(150, 120, 84, 2);
const stoneDark = stoneMat(120, 96, 66, 2);
const pillarMat = stoneMat(160, 130, 92, 1);
const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.5, metalness: 0.6, emissive: 0x3a2c0a, emissiveIntensity: 0.5 });
const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffb347, emissiveIntensity: 2.2 });
const lanterns = []; // {mesh, phase}

const pillarGeo = new THREE.CylinderGeometry(0.5, 0.6, STEP_Y + 3, 10);
const capGeo = new THREE.BoxGeometry(1.4, 0.5, 1.4);
const lanternGeo = new THREE.SphereGeometry(0.32, 12, 12);

// ---- open explorable vault (the "map"): a dark hall you roam with your torch,
// a sunken stepwell shrine at its heart, the pages ringed around it ----
const HALL = 20;

const floorMat = stoneMat(105, 84, 58, 10);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL * 2 + 12, HALL * 2 + 12), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// boundary walls (the +Z side is left open for the entrance gate)
for (const [x, z, w, d] of [
  [0, -HALL - 3, HALL * 2 + 12, 2],
  [-HALL - 3, 0, 2, HALL * 2 + 12],
  [HALL + 3, 0, 2, HALL * 2 + 12],
]) {
  const wl = new THREE.Mesh(new THREE.BoxGeometry(w, 9, d), stone);
  wl.position.set(x, 4, z);
  wl.receiveShadow = true;
  scene.add(wl);
}

// ---- the entrance: a mysterious well-gate you open, then stairs down ----
const GATE_Z = HALL + 3; // 23
const GAP = 8;

// ground height: raised entrance court -> stairs -> hall floor at 0
function groundHeightAt(z) {
  if (z >= GATE_Z + 1) return 3;
  if (z >= 14) return 3 * (z - 14) / (GATE_Z + 1 - 14);
  return 0;
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
  x.textAlign = "center";
  x.fillStyle = "#26190c";
  x.font = "bold 38px Georgia";
  x.fillText(magazine.club.name, 256, 70);
  x.font = "22px Georgia";
  magazine.club.lines.forEach((ln, i) => x.fillText(ln, 256, 135 + i * 40));
  // faint highlight to fake engraving depth
  x.fillStyle = "rgba(240,230,210,0.12)";
  x.font = "bold 38px Georgia";
  x.fillText(magazine.club.name, 255, 69);
  return new THREE.CanvasTexture(cv);
}
const inscriptionMat = new THREE.MeshStandardMaterial({ map: makeInscription(), roughness: 0.95, bumpMap: makeInscription(), bumpScale: 0.4 });

// gate facade: two wall segments flanking the gap, a lintel, inscriptions
const segW = (HALL * 2 + 12 - GAP) / 2;
for (const sgn of [-1, 1]) {
  const seg = new THREE.Mesh(new THREE.BoxGeometry(segW, 10, 2.4), stone);
  seg.position.set(sgn * (GAP / 2 + segW / 2), 5, GATE_Z);
  seg.receiveShadow = true; seg.castShadow = true;
  scene.add(seg);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(segW - 1.5, 6), inscriptionMat);
  panel.position.set(sgn * (GAP / 2 + segW / 2), 5.2, GATE_Z + 1.25);
  scene.add(panel);
}
const lintel = new THREE.Mesh(new THREE.BoxGeometry(GAP + 4, 2.2, 3), stone);
lintel.position.set(0, 9, GATE_Z);
scene.add(lintel);
// glowing keystone eye above the gate
const keystone = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfcde5a, emissive: 0xfcde5a, emissiveIntensity: 2 }));
keystone.position.set(0, 9, GATE_Z + 1.4);
keystone.scale.set(1.6, 1, 0.6);
scene.add(keystone);

// two doors hinged at the outer edges of the gap
const doorMat = new THREE.MeshStandardMaterial({ color: 0x3f2a16, roughness: 0.7, metalness: 0.2 });
function makeDoor(sgn) {
  const pivot = new THREE.Group();
  pivot.position.set(sgn * (GAP / 2), 0, GATE_Z);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(GAP / 2, 7.5, 0.5), doorMat);
  leaf.position.set(-sgn * (GAP / 4), 3.9, 0);
  // gold studs
  for (let r = 0; r < 3; r++) for (let cc = 0; cc < 2; cc++) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), gold);
    stud.position.set(-sgn * (0.6 + cc * 1.6), 2 + r * 2, 0.3);
    leaf.add(stud);
  }
  pivot.add(leaf);
  scene.add(pivot);
  return pivot;
}
const doorL = makeDoor(-1);
const doorR = makeDoor(1);
let gateOpen = false;
let gateSwing = 0;

// raised entrance courtyard floor + side walls + descent steps into the hall
const court = new THREE.Mesh(new THREE.BoxGeometry(GAP + 10, 1, 12), stoneDark);
court.position.set(0, 2.5, GATE_Z + 6);
court.receiveShadow = true;
scene.add(court);
for (const sgn of [-1, 1]) {
  const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 8, 12), stone);
  w2.position.set(sgn * (GAP / 2 + 5), 6, GATE_Z + 6);
  scene.add(w2);
}
const backWall = new THREE.Mesh(new THREE.BoxGeometry(GAP + 11, 12, 1.5), stone);
backWall.position.set(0, 6, GATE_Z + 12);
scene.add(backWall);
// descent steps (visual) from the gate down into the hall
for (let s = 0; s < 6; s++) {
  const f = s / 6;
  const step = new THREE.Mesh(new THREE.BoxGeometry(GAP, 0.6, 1.6), s % 2 ? stoneDark : stone);
  step.position.set(0, 3 - 3 * (s / 5) - 0.3, 14 + (GATE_Z + 1 - 14) * (1 - f));
  step.receiveShadow = true;
  scene.add(step);
}

// a ring of pillars + capitals, with hanging lanterns on alternate ones
for (let a = 0; a < 12; a++) {
  const ang = (a / 12) * Math.PI * 2;
  const px = Math.cos(ang) * 15.5;
  const pz = Math.sin(ang) * 15.5;
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.set(px, 3.1, pz);
  pillar.castShadow = true;
  scene.add(pillar);
  const cap = new THREE.Mesh(capGeo, gold);
  cap.position.set(px, 6.4, pz);
  scene.add(cap);
  if (a % 2 === 0) {
    const lantern = new THREE.Mesh(lanternGeo, lanternMat.clone());
    lantern.position.set(px * 0.92, 3.5, pz * 0.92);
    scene.add(lantern);
    lanterns.push({ mesh: lantern, phase: a * 0.7 });
  }
}

// a stepped circular dais at the heart of the hall
for (let s = 0; s < 3; s++) {
  const r = 4.2 - s * 0.9;
  const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.5, 0.5, 40), s % 2 ? stoneDark : stone);
  tier.position.set(0, 0.25 + s * 0.5, 0);
  tier.receiveShadow = true;
  scene.add(tier);
}
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
emblem.position.set(0, 3.8, 0);
scene.add(emblem);
// a soft teal light from the emblem
const emblemLight = new THREE.PointLight(0x3fd8bf, 2.2, 22, 2);
emblemLight.position.set(0, 3.8, 0);
scene.add(emblemLight);

// where each page waits — ringed around the shrine
const PAGE_SPOTS = STOPS.map((_, i) => {
  const ang = (i / STOPS.length) * Math.PI * 2 + 0.32;
  return new THREE.Vector3(Math.cos(ang) * 11, 0, Math.sin(ang) * 11);
});

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
chest.position.set(0, 0, -16);
scene.add(chest);

// ---- the Sutradhar (cartoon proportions: big head, expressive face,
// holding a torch that is the only real light in the dark) ----
const SKIN = new THREE.MeshStandardMaterial({ color: 0xe6b98a, roughness: 0.6 });
const ROBE_MAT = new THREE.MeshStandardMaterial({ color: 0xd97a2b, roughness: 0.7 });
const hero = new THREE.Group();

// rounded little body
const robe = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.0, 16), ROBE_MAT);
robe.position.y = 1.0;
robe.castShadow = true;
hero.add(robe);
const sash = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.13, 8, 20), new THREE.MeshStandardMaterial({ color: 0x7a2230 }));
sash.position.y = 1.65;
sash.rotation.x = Math.PI / 2;
hero.add(sash);

// head + face grouped so they bob together; face is on the -Z side (toward
// the camera) so the Sutradhar looks at the seeker like a guide
const headGroup = new THREE.Group();
hero.add(headGroup);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.82, 20, 20), SKIN);
head.position.y = 2.7;
head.scale.set(1, 0.95, 0.95);
head.castShadow = true;
headGroup.add(head);
// ears
for (const ex of [-0.8, 0.8]) {
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), SKIN);
  ear.position.set(ex, 2.62, 0);
  headGroup.add(ear);
}
// turban with a glowing jewel
const turban = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14, 0, Math.PI * 2, 0, Math.PI / 1.7), new THREE.MeshStandardMaterial({ color: 0x145047, roughness: 0.7 }));
turban.position.y = 3.02;
turban.scale.set(1.05, 0.9, 1.05);
headGroup.add(turban);
const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfcde5a, emissive: 0xfcde5a, emissiveIntensity: 1.6 }));
jewel.position.set(0, 3.2, -0.6);
headGroup.add(jewel);

// big expressive eyes
const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xf7f2ea, roughness: 0.35 });
const eyeDark = new THREE.MeshStandardMaterial({ color: 0x1a2420, roughness: 0.25 });
const browMat = new THREE.MeshStandardMaterial({ color: 0x2a1f14 });
for (const ex of [-0.3, 0.3]) {
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), eyeWhite);
  white.position.set(ex, 2.78, -0.6);
  white.scale.set(0.85, 1.1, 0.6);
  headGroup.add(white);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), eyeDark);
  pupil.position.set(ex, 2.75, -0.74);
  headGroup.add(pupil);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  shine.position.set(ex + 0.04, 2.8, -0.82);
  headGroup.add(shine);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.08), browMat);
  brow.position.set(ex, 3.05, -0.66);
  brow.rotation.z = ex < 0 ? 0.12 : -0.12;
  headGroup.add(brow);
}
// nose + rosy cheeks + mouth (mouth scales open while speaking)
const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), SKIN);
nose.position.set(0, 2.62, -0.82);
headGroup.add(nose);
for (const ex of [-0.46, 0.46]) {
  const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), new THREE.MeshStandardMaterial({ color: 0xe08a6a, roughness: 0.7 }));
  cheek.position.set(ex, 2.5, -0.66);
  cheek.scale.set(1, 0.7, 0.4);
  headGroup.add(cheek);
}
const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), new THREE.MeshStandardMaterial({ color: 0x5a2530, roughness: 0.5 }));
mouth.position.set(0, 2.34, -0.72);
mouth.scale.set(1.5, 0.35, 0.4);
headGroup.add(mouth);
// the third eye — the Anvesha seeing-eye, glowing gold between the brows
const tilak = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), new THREE.MeshStandardMaterial({ color: 0xfcde5a, emissive: 0xfcde5a, emissiveIntensity: 2 }));
tilak.position.set(0, 3.02, -0.68);
tilak.scale.set(0.7, 1.3, 0.5);
headGroup.add(tilak);

// arms (pivot at shoulder)
const armGeo = new THREE.CylinderGeometry(0.14, 0.12, 1.1, 8);
armGeo.translate(0, -0.55, 0);
const armL = new THREE.Group();
armL.position.set(-0.62, 1.85, 0);
armL.add(new THREE.Mesh(armGeo, ROBE_MAT));
hero.add(armL);
const armR = new THREE.Group(); // holds the torch
armR.position.set(0.62, 1.85, -0.1);
armR.add(new THREE.Mesh(armGeo, ROBE_MAT));
hero.add(armR);

// the torch: a handle + a bright flame that is the light source
const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x4a2f18 }));
handle.position.set(0.05, -1.0, 0.1);
armR.add(handle);
const diya = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffcf5a, emissiveIntensity: 3.2 }));
diya.position.set(0.05, -1.5, 0.1);
armR.add(diya);
const diyaGlow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffcf5a, transparent: true, opacity: 0.3 }));
diya.add(diyaGlow);
const lamp = new THREE.PointLight(0xffce6a, 14, 55, 2);
lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024);
diya.add(lamp);
// a soft warm light that keeps the Sutradhar's face readable in the dark
const faceLight = new THREE.PointLight(0xffdca6, 2.4, 8, 2);
faceLight.position.set(0, 2.7, -1.5);
hero.add(faceLight);
scene.add(hero);

// hero roams the floor freely in X/Z; y follows the ground (entrance is raised)
const heroPos = new THREE.Vector3(0, 0, GATE_Z + 8);
let heroFacing = Math.PI; // facing the gate / into the hall
function placeHero() {
  hero.position.set(heroPos.x, groundHeightAt(heroPos.z) + 0.2, heroPos.z);
}
placeHero();

// ---- page tablets (one per stop) ----
const tablets = [];
function makeTablet(stop, i) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 2.7, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xc9a24b, emissive: 0x000000, roughness: 0.4, metalness: 0.5 })
  );
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 2.2, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xf4ece0, emissive: 0x000000, roughness: 0.6 })
  );
  panel.position.z = 0.02;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.9, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfcde5a, transparent: true, opacity: 0.0 }));
  g.add(frame, panel, halo);
  // carved pedestal beneath the page
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 1.7, 8), pillarMat);
  ped.position.y = -2.15;
  ped.receiveShadow = true;
  g.add(ped);
  const spot = PAGE_SPOTS[i];
  g.position.set(spot.x, 2.6, spot.z);
  g.rotation.y = Math.atan2(-spot.x, -spot.z); // face the centre of the hall
  g.userData = { stop, i, baseY: 2.6, frame, panel, halo, spot };
  scene.add(g);
  return g;
}
STOPS.forEach((s, i) => tablets.push(makeTablet(s, i)));

// ---- dust motes ----
const moteCount = 140;
const mgeo = new THREE.BufferGeometry();
const mpos = new Float32Array(moteCount * 3);
for (let i = 0; i < moteCount; i++) {
  mpos[i * 3] = (Math.random() - 0.5) * 26;
  mpos[i * 3 + 1] = -Math.random() * STOPS.length * STEP_Y;
  mpos[i * 3 + 2] = Math.random() * STOPS.length * STEP_Z;
}
mgeo.setAttribute("position", new THREE.BufferAttribute(mpos, 3));
const motes = new THREE.Points(mgeo, new THREE.PointsMaterial({ color: 0xfcde5a, size: 0.1, transparent: true, opacity: 0.7, depthWrite: false }));
scene.add(motes);

// ---- interaction ----
const prompt = document.getElementById("prompt3d");
function nearestOpenableTablet() {
  // free exploration: whichever page you are standing closest to
  let best = null;
  let bestD = 999;
  for (const t of tablets) {
    const dx = t.userData.spot.x - heroPos.x;
    const dz = t.userData.spot.z - heroPos.z;
    const d = Math.hypot(dx, dz);
    if (d < bestD) { bestD = d; best = t; }
  }
  return bestD < 3.4 ? best : null;
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

function jumpToStop(i) {
  const spot = PAGE_SPOTS[i];
  // stand just inside the ring from the page, facing it
  heroPos.set(spot.x * 0.8, 0, spot.z * 0.8);
  placeHero();
}
setJumpHandler((pageId) => {
  const idx = STOPS.findIndex((s) => s.page.id === pageId);
  if (idx !== -1) {
    jumpToStop(idx);
    openStop(STOPS[idx]);
  }
});

// ---- opening splash gate ----
let started = false;
let settling = false; // the opening camera swoop, before control is handed over
let enteringHall = false; // scripted stride down through the gate into the hall
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
    // near the closed gate? open it and stride down into the hall
    if (!gateOpen && heroPos.z > GATE_Z - 1 && Math.abs(heroPos.x) < GAP) {
      gateOpen = true;
      enteringHall = true;
      playDescentRumble();
      return;
    }
    const t = nearestOpenableTablet();
    if (t) openStop(t.userData.stop);
  }
  // quick shortcuts: index / journal / cycle camera angle
  if (!isAnyOverlayOpen()) {
    if (k === "i") openContents();
    if (k === "j") openJournal();
    if (k === "v") {
      presetIdx = (presetIdx + 1) % PRESETS.length;
      camYaw = PRESETS[presetIdx].yaw;
      camPitch = PRESETS[presetIdx].pitch;
    }
  }
  if (k === "escape") {
    if (isReaderOpen()) return closeReader();
    if (isContentsOpen()) return closeContents();
    if (isJournalOpen()) return closeJournal();
  }
});
addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

// ---- camera orbit (drag to rotate) + preset angles (V) ----
let camYaw = 0;
let camPitch = 0.72;
const CAM_DIST = 14;
const PRESETS = [
  { yaw: 0, pitch: 0.72 },      // high map view
  { yaw: 0.7, pitch: 0.28 },    // over-shoulder
  { yaw: 0, pitch: 0.85 },      // high looking down the well
  { yaw: Math.PI * 0.42, pitch: 0.22 }, // side profile
];
let presetIdx = 0;

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
    const tb = nearestOpenableTablet();
    if (tb) openStop(tb.userData.stop);
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
  const W = 160, R = W / 2, scale = (R - 12) / HALL;
  mmx.clearRect(0, 0, W, W);
  const toXY = (x, z) => [R + x * scale, R + z * scale];
  // central emblem
  let [cx, cy] = toXY(0, 0);
  mmx.fillStyle = "#3fd8bf";
  mmx.beginPath(); mmx.arc(cx, cy, 5, 0, 7); mmx.fill();
  // pages
  for (const tb of tablets) {
    const [px, py] = toXY(tb.userData.spot.x, tb.userData.spot.z);
    mmx.fillStyle = isDone(tb.userData.stop) ? "#7fbf9f" : "#fcde5a";
    mmx.beginPath(); mmx.arc(px, py, 4, 0, 7); mmx.fill();
  }
  // player + facing
  const [hx, hy] = toXY(heroPos.x, heroPos.z);
  mmx.strokeStyle = "#f4ece0"; mmx.lineWidth = 2;
  mmx.beginPath(); mmx.moveTo(hx, hy); mmx.lineTo(hx + Math.sin(heroFacing) * 10, hy + Math.cos(heroFacing) * 10); mmx.stroke();
  mmx.fillStyle = "#ffffff";
  mmx.beginPath(); mmx.arc(hx, hy, 4, 0, 7); mmx.fill();
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
  const targetSwing = gateOpen ? 1 : 0;
  gateSwing += (targetSwing - gateSwing) * 0.04;
  doorL.rotation.y = gateSwing * 1.3;
  doorR.rotation.y = -gateSwing * 1.3;
  keystone.material.emissiveIntensity = 2 + Math.sin(t * 4) * 0.6;

  let moving = false;

  // scripted stride down through the just-opened gate into the hall
  if (enteringHall) {
    moving = true;
    heroFacing = Math.PI;
    heroPos.x += (0 - heroPos.x) * 0.1;
    heroPos.z -= 0.13;
    placeHero();
    if (heroPos.z < GATE_Z - 6) enteringHall = false;
  } else if (!overlay) {
    const run = keys["shift"] ? 1.8 : 1;
    let f = 0, r = 0;
    if (keys["arrowup"] || keys["w"]) f += 1;
    if (keys["arrowdown"] || keys["s"]) f -= 1;
    if (keys["arrowright"] || keys["d"]) r += 1;
    if (keys["arrowleft"] || keys["a"]) r -= 1;
    if (f || r) {
      moving = true;
      // move relative to where the camera is looking (feels natural with orbit)
      const camDir = new THREE.Vector3(hero.position.x - camera.position.x, 0, hero.position.z - camera.position.z);
      if (camDir.lengthSq() < 0.001) camDir.set(0, 0, 1);
      camDir.normalize();
      const right = new THREE.Vector3(-camDir.z, 0, camDir.x);
      const mv = new THREE.Vector3().addScaledVector(camDir, f).addScaledVector(right, r);
      if (mv.lengthSq() > 0) {
        mv.normalize();
        const spd = 0.17 * run;
        heroPos.x += mv.x * spd;
        heroPos.z += mv.z * spd;
        // stay within the world (the entrance court extends past the hall)
        heroPos.x = Math.max(-HALL + 1, Math.min(HALL - 1, heroPos.x));
        heroPos.z = Math.max(-HALL + 1, Math.min(GATE_Z + 9, heroPos.z));
        // the closed gate blocks the way down into the hall
        if (!gateOpen && heroPos.z < GATE_Z + 1.2) heroPos.z = GATE_Z + 1.2;
        // keep out of the central dais (only in the hall, past the gate)
        if (heroPos.z < GATE_Z - 2) {
          const cd = Math.hypot(heroPos.x, heroPos.z);
          if (cd < 5.4) { heroPos.x = (heroPos.x / cd) * 5.4; heroPos.z = (heroPos.z / cd) * 5.4; }
        }
        heroFacing = Math.atan2(mv.x, mv.z);
        placeHero();
      }
    }
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
  emblem.rotation.y = t * 0.35;
  emblem.position.y = 3.8 + Math.sin(t * 1.1) * 0.15;
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

  // every page hides in the dark and is REVEALED by the torch as you near it;
  // read ones stay softly lit (silver-green), unread ones glow warm gold
  const REVEAL = 13;
  for (const tb of tablets) {
    const done = isDone(tb.userData.stop);
    tb.position.y = tb.userData.baseY + Math.sin(t * 1.4 + tb.userData.i) * 0.2;
    tb.rotation.y = Math.sin(t * 0.5 + tb.userData.i) * 0.3;
    const d = tb.position.distanceTo(hero.position);
    const prox = Math.max(0, Math.min(1, 1 - d / REVEAL)); // 1 = right at the lamp
    const em = tb.userData.frame.material;
    const pem = tb.userData.panel.material;
    em.color.setHex(0xc9a24b);
    pem.color.setHex(0xf4ece0);
    if (done) {
      em.emissive.setHex(0x2a4a2f); pem.emissive.setHex(0x203a2a);
      em.emissiveIntensity = 0.5 * prox; pem.emissiveIntensity = 0.45 * prox;
      tb.userData.halo.material.opacity = 0.05 * prox;
    } else {
      const pulse = 0.55 + 0.45 * Math.sin(t * 3 + tb.userData.i);
      em.emissive.setHex(0x8a6a1f); pem.emissive.setHex(0x6f6a2a);
      em.emissiveIntensity = (0.35 + pulse * 0.9) * prox;
      pem.emissiveIntensity = (0.3 + pulse * 0.8) * prox;
      tb.userData.halo.material.opacity = (0.04 + pulse * 0.08) * prox;
    }
  }

  // motes rise
  const p = motes.geometry.attributes.position.array;
  for (let i = 0; i < moteCount; i++) {
    p[i * 3 + 1] += 0.02;
    if (p[i * 3 + 1] > 4) p[i * 3 + 1] = -STOPS.length * STEP_Y;
  }
  motes.geometry.attributes.position.needsUpdate = true;

  // third-person camera behind & above the hero
  // orbit camera: spherical offset around the hero from yaw/pitch
  const cp = Math.max(0.08, Math.min(1.15, camPitch));
  const ox = Math.sin(camYaw) * Math.cos(cp) * CAM_DIST;
  const oy = Math.sin(cp) * CAM_DIST + 3.4; // higher so steps don't occlude
  const oz = Math.cos(camYaw) * Math.cos(cp) * CAM_DIST; // camera sits behind (+Z), looking into the hall
  const desired = new THREE.Vector3(hero.position.x + ox, hero.position.y + oy, hero.position.z + oz);
  camera.position.lerp(desired, 0.1);
  camera.lookAt(hero.position.x, hero.position.y + 1.8, hero.position.z - 4);

  // proximity prompt
  if (!overlay) {
    const near = nearestOpenableTablet();
    prompt.textContent = near ? "Press E to open · " + near.userData.stop.page.title : "";
    prompt.style.opacity = near ? "1" : "0";
  } else {
    prompt.style.opacity = "0";
  }

  checkComplete();
  drawMinimap();
  composer.render();
  requestAnimationFrame(animate);
}
animate();
