import * as THREE from "three";
import gsap from "gsap";
import { magazine } from "./content/magazine.config.js";
import { state } from "./state.js";
import { surfaceFragment, isJourneyComplete, getSurfacedCount } from "./systems/fragments.js";
import { playFragmentChime } from "./systems/audio.js";
import { openReader, isReaderOpen, closeReader } from "./ui/reader.js";
import { openJournal, isJournalOpen, closeJournal } from "./ui/journal.js";
import { openContents, isContentsOpen, closeContents, setJumpHandler } from "./ui/contents.js";
import { narrate, advanceNarration, isNarrating } from "./ui/narration.js";
import { mountHud, updateHudCount, getHudJournalButtonRect } from "./ui/hud.js";
import { isAnyOverlayOpen } from "./ui/overlays.js";

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
scene.fog = new THREE.FogExp2(0x06201b, 0.03);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("three-root").appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x2a6b5f, 0.5));
const rim = new THREE.DirectionalLight(0x8fd8c8, 0.35);
rim.position.set(-10, 20, 8);
scene.add(rim);

// ---- descent path helpers ----
const STEP_Y = 3.2; // how far each stop drops
const STEP_Z = 5.5; // how far each stop recedes
const SIDE = 4.2; // tablet offset to the side of the path
function pathAt(p) {
  return new THREE.Vector3(0, -p * STEP_Y, p * STEP_Z);
}

// ---- stepwell geometry along the path ----
const stone = new THREE.MeshStandardMaterial({ color: 0x14504a, roughness: 0.92, metalness: 0.04 });
const stoneDark = new THREE.MeshStandardMaterial({ color: 0x0e3d38, roughness: 1 });
for (let i = -1; i < STOPS.length + 1; i++) {
  const c = pathAt(i);
  // a broad step/landing slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 1, STEP_Z + 0.2), i % 2 ? stoneDark : stone);
  slab.position.set(0, c.y - 1.5, c.z);
  slab.receiveShadow = true;
  scene.add(slab);
  // side walls
  for (const sx of [-8, 8]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, STEP_Y + 3, STEP_Z + 0.2), stone);
    wall.position.set(sx, c.y + 0.5, c.z);
    wall.receiveShadow = true;
    wall.castShadow = true;
    scene.add(wall);
  }
}
// water at the very bottom
const water = new THREE.Mesh(
  new THREE.CircleGeometry(7, 40),
  new THREE.MeshStandardMaterial({ color: 0x041a16, roughness: 0.15, metalness: 0.7 })
);
water.rotation.x = -Math.PI / 2;
const bottom = pathAt(STOPS.length + 0.5);
water.position.set(0, bottom.y - 2, bottom.z);
scene.add(water);

// ---- the Sutradhar ----
const hero = new THREE.Group();
const robe = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3, 12), new THREE.MeshStandardMaterial({ color: 0xd97a2b, roughness: 0.7 }));
robe.position.y = 1.5;
robe.castShadow = true;
hero.add(robe);
const sash = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.14, 8, 16), new THREE.MeshStandardMaterial({ color: 0x7a2230 }));
sash.position.y = 2.1;
sash.rotation.x = Math.PI / 2;
hero.add(sash);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0xe0b280, roughness: 0.6 }));
head.position.y = 3.3;
head.castShadow = true;
hero.add(head);
const turban = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x145047 }));
turban.position.y = 3.55;
hero.add(turban);
const diya = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffcf5a, emissiveIntensity: 3 }));
diya.position.set(1.0, 2.4, 0.5);
hero.add(diya);
const diyaGlow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffcf5a, transparent: true, opacity: 0.25 }));
diya.add(diyaGlow);
const lamp = new THREE.PointLight(0xffcf6a, 7, 30, 2);
lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024);
diya.add(lamp);
scene.add(hero);

// hero moves along the path parameter `heroP` plus a sideways strafe
let heroP = currentIndex();
let strafe = 0;
function placeHero() {
  const c = pathAt(heroP);
  hero.position.set(strafe, c.y + 0.2, c.z);
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
  const c = pathAt(i);
  const side = i % 2 ? 1 : -1;
  g.position.set(side * SIDE, c.y + 2.2, c.z);
  g.userData = { stop, i, baseY: c.y + 2.2, frame, panel, halo };
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
  const cur = currentIndex();
  let best = null;
  let bestD = 999;
  for (const t of tablets) {
    if (t.userData.i > cur) continue; // locked
    const d = Math.abs(t.userData.i - heroP) + Math.abs(t.position.x - strafe) * 0.15;
    if (d < bestD) { bestD = d; best = t; }
  }
  return bestD < 0.7 ? best : null;
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
  heroP = i;
  strafe = (i % 2 ? 1 : -1) * (SIDE - 1.6);
  placeHero();
}
setJumpHandler((pageId) => {
  const idx = STOPS.findIndex((s) => s.page.id === pageId);
  if (idx !== -1 && idx <= currentIndex()) {
    jumpToStop(idx);
    openStop(STOPS[idx]);
  }
});

// ---- opening splash gate ----
let started = false;
const splash = document.getElementById("splash");
function begin() {
  if (started) return;
  started = true;
  splash.classList.add("gone");
  if (getSurfacedCount() === 0) setTimeout(() => narrate(magazine.sutradhar.welcome), 300);
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
    const t = nearestOpenableTablet();
    if (t) openStop(t.userData.stop);
  }
  if (k === "escape") {
    if (isReaderOpen()) return closeReader();
    if (isContentsOpen()) return closeContents();
    if (isJournalOpen()) return closeJournal();
  }
});
addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

// click-to-open via raycasting
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener("click", (e) => {
  if (isNarrating()) { advanceNarration(); return; }
  if (isAnyOverlayOpen()) return;
  const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(tablets, true);
  if (hits.length) {
    let g = hits[0].object;
    while (g && !g.userData.stop) g = g.parent;
    if (g && g.userData.i <= currentIndex()) { jumpToStop(g.userData.i); openStop(g.userData.stop); }
  }
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- HUD (welcome narration fires from begin() after the splash) ----
mountHud();

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
function animate() {
  const t = clock.getElapsedTime();
  const overlay = isAnyOverlayOpen() || !started;

  if (!overlay) {
    let dp = 0;
    if (keys["arrowdown"] || keys["s"]) dp += 1;
    if (keys["arrowup"] || keys["w"]) dp -= 1;
    let ds = 0;
    if (keys["arrowleft"] || keys["a"]) ds -= 1;
    if (keys["arrowright"] || keys["d"]) ds += 1;
    heroP = Math.max(0, Math.min(STOPS.length - 1, heroP + dp * 0.04));
    strafe = Math.max(-(SIDE - 1.2), Math.min(SIDE - 1.2, strafe + ds * 0.14));
    placeHero();
  }

  // idle/walk bob + facing
  const moving = !overlay && (keys["arrowdown"] || keys["s"] || keys["arrowup"] || keys["w"] || keys["arrowleft"] || keys["a"] || keys["arrowright"] || keys["d"]);
  robe.position.y = 1.5 + Math.abs(Math.sin(t * 3)) * (moving ? 0.14 : 0.03);
  head.position.y = 3.3 + Math.abs(Math.sin(t * 3)) * (moving ? 0.14 : 0.03);
  hero.rotation.y += ((strafe > 0 ? 0.25 : strafe < 0 ? -0.25 : 0) - hero.rotation.y) * 0.1;
  lamp.intensity = 7 + Math.sin(t * 12) * 1.3;
  diyaGlow.scale.setScalar(1 + Math.sin(t * 10) * 0.15);

  // tablets: state-driven glow + float
  const cur = currentIndex();
  for (const tb of tablets) {
    const s = tb.userData.stop;
    const done = isDone(s);
    const locked = tb.userData.i > cur;
    tb.position.y = tb.userData.baseY + Math.sin(t * 1.4 + tb.userData.i) * 0.2;
    tb.rotation.y = Math.sin(t * 0.5 + tb.userData.i) * 0.35;
    const em = tb.userData.frame.material;
    const pem = tb.userData.panel.material;
    if (locked) { em.emissive.setHex(0x0a2c26); em.emissiveIntensity = 1; pem.emissive.setHex(0x0a2c26); pem.emissiveIntensity = 1; tb.userData.halo.material.opacity = 0; tb.userData.frame.material.color.setHex(0x2a3f3a); pem.color.setHex(0x24332f); }
    else if (done) { em.emissive.setHex(0x2a4a2f); em.emissiveIntensity = 0.5; pem.emissive.setHex(0x203a2a); pem.emissiveIntensity = 0.4; tb.userData.halo.material.opacity = 0.05; em.color.setHex(0xc9a24b); pem.color.setHex(0xf4ece0); }
    else { const pulse = 0.5 + 0.5 * Math.sin(t * 3); em.emissive.setHex(0x8a6a1f); em.emissiveIntensity = 0.6 + pulse * 0.7; pem.emissive.setHex(0x6f6a2a); pem.emissiveIntensity = 0.5 + pulse * 0.6; tb.userData.halo.material.opacity = 0.06 + pulse * 0.06; em.color.setHex(0xc9a24b); pem.color.setHex(0xf4ece0); }
  }

  // motes rise
  const p = motes.geometry.attributes.position.array;
  for (let i = 0; i < moteCount; i++) {
    p[i * 3 + 1] += 0.02;
    if (p[i * 3 + 1] > 4) p[i * 3 + 1] = -STOPS.length * STEP_Y;
  }
  motes.geometry.attributes.position.needsUpdate = true;

  // third-person camera behind & above the hero
  const desired = new THREE.Vector3(hero.position.x * 0.5, hero.position.y + 6.5, hero.position.z - 9);
  camera.position.lerp(desired, 0.08);
  camera.lookAt(hero.position.x * 0.4, hero.position.y + 2, hero.position.z + 3);

  // proximity prompt
  if (!overlay) {
    const near = nearestOpenableTablet();
    prompt.textContent = near ? "Press E to open · " + near.userData.stop.page.title : "";
    prompt.style.opacity = near ? "1" : "0";
  } else {
    prompt.style.opacity = "0";
  }

  checkComplete();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
