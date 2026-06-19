# Anvesha Stepwell — v1 Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, playable, polished vertical slice of the Anvesha stepwell game: Surface tier → Folk Arts Gallery tier → Wellspring ending, with the full design/animation layer from the spec.

**Architecture:** Kaplay 3001 for the explorable world (one generic `tier` scene driven entirely by `magazine.config.js`), vanilla HTML/CSS + GSAP for all overlay UI (reader, journal, dialogue, HUD), Vite for dev/build, no backend. Pure-logic pieces (config validation, fragment/journal state) are unit-tested with Vitest; everything visual/animated is verified by running the dev server and playing it.

**Tech Stack:** Kaplay `^3001` (top-down, `setGravity(0)`, `area()`+`body()` collision), GSAP (free core), Vite, Vitest, vanilla JS (no framework), vanilla CSS with custom-property design tokens.

**Spec:** `docs/superpowers/specs/2026-06-19-anvesha-stepwell-game-design.md` — read it before implementing; this plan implements it task-by-task. The original full PRD is `anvesha-stepwell-prd-v2.md` (context only, not authoritative for this slice's scope).

## Global Constraints

- Node.js 22+ required.
- Kaplay pinned to the `3001` line (`npm install kaplay@3001`) — never install `kaplay@4000`/`kaplay@latest` if it would jump major lines.
- Fully static, no backend, no server-side code.
- All page/NPC/fragment content lives only in `src/content/magazine.config.js` — engine and UI code must never hardcode page titles, captions, or dialogue strings.
- HUD counter text must read exactly `Surfaced: X / N` (thematic wording, not "Found"/"Collected").
- Audio must never play before the first user-initiated keypress/click (browser autoplay policy).
- No hardcoded hex colors in any CSS file outside `src/styles/tokens.css` — every color reference goes through a CSS custom property.
- Fragment grid for this slice is fixed at 1×5 (5 pages total: 1 Surface + 4 Folk Arts Gallery; pages `p02` and `p04` carry a `hiddenImage`, the rest are single-layer).
- This slice covers exactly 2 tiers (`surface`, `folk-arts`) + `title` + `ending` scenes. Do not build the remaining 4 PRD tiers in this plan.
- Top-down movement: `setGravity(0)` globally; walls use `body({ isStatic: true })`, the Seeker uses `body()` (dynamic but unaffected by zero gravity) — both need `area()` for collision.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles/tokens.css`

**Interfaces:**
- Produces: a running Vite dev server at `http://localhost:5173` showing a blank dark-indigo Kaplay canvas with no console errors. Later tasks import `kaplay` the same way `src/main.js` does and rely on `setGravity(0)` already being set.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "anvesha-stepwell",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "gen:placeholders": "node scripts/generate-placeholder-content.mjs"
  },
  "dependencies": {
    "kaplay": "3001",
    "gsap": "^3.12.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
dist/
.DS_Store
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: installs without error, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 4: Write `vite.config.js`**

```js
export default {
  base: "./",
  server: { port: 5173 },
};
```

- [ ] **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Anvesha — The Stepwell of Anvesha</title>
    <link rel="stylesheet" href="/src/styles/tokens.css" />
    <link rel="stylesheet" href="/src/styles/ui.css" />
  </head>
  <body>
    <div id="lantern-overlay"></div>
    <div id="dialogue-root"></div>
    <div id="reader-root"></div>
    <div id="journal-root"></div>
    <div id="hud-root"></div>
    <div id="transition-root"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `src/styles/tokens.css`**

```css
:root {
  --tier-surface: #E8C77A;
  --tier-folk-arts: #D97A2B;
  --tier-dialects: #B5482E;
  --tier-library: #7A2230;
  --tier-architecture: #34406B;
  --tier-inner-depths: #243A33;
  --linework-gold: #C9A24B;
  --diya-gold: #FCDE5A;
  --archival-ivory: #F6E7D2;
  --ink: #2A1F14;
  --overlay-dark: rgba(10, 8, 14, 0.92);
}
```

(`src/styles/ui.css` is created empty here as a placeholder for Task 8 onward — it is referenced by `index.html` now so the link tag never 404s.)

- [ ] **Step 6b: Write empty `src/styles/ui.css`**

```css
/* populated starting Task 8 */
```

- [ ] **Step 7: Write `src/main.js`**

```js
import kaplay from "kaplay";

const k = kaplay({
  width: 960,
  height: 540,
  letterbox: true,
  background: [20, 18, 30],
  global: true,
});

setGravity(0);

scene("boot", () => {
  add([
    text("Anvesha", { size: 48 }),
    pos(width() / 2, height() / 2),
    anchor("center"),
    color(252, 222, 90),
  ]);
});

go("boot");

export default k;
```

- [ ] **Step 8: Verify it runs**

Run: `npm run dev`
Expected: prints a local URL (e.g. `http://localhost:5173`). Open it — use the `run` skill to launch and view it in-browser. Confirm: dark indigo background, "Anvesha" text centered in diya-gold, zero console errors. Stop the dev server after confirming.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore vite.config.js index.html src/main.js src/styles/tokens.css src/styles/ui.css
git commit -m "Scaffold Vite + Kaplay + GSAP project, boot scene renders"
```

---

### Task 2: Global state module

**Files:**
- Create: `src/state.js`
- Test: `tests/state.test.js`

**Interfaces:**
- Produces: `import { state, resetState } from "../src/state.js"` — `state` is a mutable object `{ fragmentsSurfaced: Set<string>, currentTier: string|null, audioMuted: boolean }`. `resetState()` clears it back to initial values. Later tasks (fragments system, audio system, scenes) read/write `state` directly via this import.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { state, resetState } from "../src/state.js";

describe("state", () => {
  it("starts with no fragments surfaced, no tier, audio unmuted", () => {
    resetState();
    expect(state.fragmentsSurfaced.size).toBe(0);
    expect(state.currentTier).toBeNull();
    expect(state.audioMuted).toBe(false);
  });

  it("resetState clears prior mutations", () => {
    resetState();
    state.fragmentsSurfaced.add("f01");
    state.currentTier = "surface";
    state.audioMuted = true;
    resetState();
    expect(state.fragmentsSurfaced.size).toBe(0);
    expect(state.currentTier).toBeNull();
    expect(state.audioMuted).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/state.test.js`
Expected: FAIL — `src/state.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export const state = {
  fragmentsSurfaced: new Set(),
  currentTier: null,
  audioMuted: false,
};

export function resetState() {
  state.fragmentsSurfaced = new Set();
  state.currentTier = null;
  state.audioMuted = false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/state.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state.js tests/state.test.js
git commit -m "Add global state module with reset"
```

---

### Task 3: Magazine content config + validation

**Files:**
- Create: `src/content/magazine.config.js`
- Create: `src/content/validate-config.js`
- Test: `tests/validate-config.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `magazine.config.js` exports `magazine` shaped per PRD §10 plus a `sutradhar` field (`title`, `sutradhar: {closingComplete, closingIncomplete}`, `fragments: {image, rows, cols}`, `tiers: [{id, name, section, depth, light, palette, map, npc, pages}]`). `validate-config.js` exports `validateConfig(magazine)` returning `{ valid: boolean, totalPages: number, errors: string[] }`. Every later task that reads tiers/pages/NPCs/Sutradhar lines imports `magazine` from this file; nothing else may hardcode tier, page, or narration content (Global Constraints).

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { validateConfig } from "../src/content/validate-config.js";

describe("validateConfig", () => {
  it("passes when fragments.rows * cols equals total page count", () => {
    const cfg = {
      fragments: { rows: 1, cols: 2 },
      tiers: [{ pages: [{ id: "a" }] }, { pages: [{ id: "b" }] }],
    };
    const result = validateConfig(cfg);
    expect(result.valid).toBe(true);
    expect(result.totalPages).toBe(2);
    expect(result.errors).toEqual([]);
  });

  it("fails when fragments.rows * cols does not match total page count", () => {
    const cfg = {
      fragments: { rows: 1, cols: 5 },
      tiers: [{ pages: [{ id: "a" }] }],
    };
    const result = validateConfig(cfg);
    expect(result.valid).toBe(false);
    expect(result.totalPages).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate-config.test.js`
Expected: FAIL — `src/content/validate-config.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export function validateConfig(cfg) {
  const totalPages = cfg.tiers.reduce((sum, tier) => sum + tier.pages.length, 0);
  const expected = cfg.fragments.rows * cfg.fragments.cols;
  const errors = [];
  if (expected !== totalPages) {
    errors.push(
      `fragments.rows (${cfg.fragments.rows}) * cols (${cfg.fragments.cols}) = ${expected}, but total pages = ${totalPages}`
    );
  }
  return { valid: errors.length === 0, totalPages, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validate-config.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `src/content/magazine.config.js` with the slice's real content**

```js
export const magazine = {
  title: "Anvesha — The Stepwell of Anvesha",

  sutradhar: {
    closingComplete: "Every fragment surfaced becomes the whole.\nWhat was hidden, you have made visible.",
    closingIncomplete: "There is more to seek above.",
  },

  fragments: {
    image: "/art/final-artwork.svg",
    rows: 1,
    cols: 5,
  },

  tiers: [
    {
      id: "surface",
      name: "The Surface",
      section: "Introduction",
      depth: 0,
      light: 1.0,
      palette: { wall: "#E8C77A", bg: "#2A3A5E" },
      map: [
        "########################",
        "#......................#",
        "#......S.......C.......#",
        "#..........p...........#",
        "#.....................>#",
        "########################",
      ],
      npc: {
        id: "custodian",
        lines: [
          "Welcome, seeker.",
          "What everyone sees is only the surface.",
          "The true stories of Anvesha lie below. Descend, and uncover them.",
        ],
      },
      pages: [
        {
          id: "p01",
          title: "Editor's Note",
          surfaceImage: "/pages/p01-surface.svg",
          hiddenImage: null,
          caption: "From the editorial desk",
          archiveUrl: null,
          fragmentId: "f01",
        },
      ],
    },
    {
      id: "folk-arts",
      name: "Folk Arts Gallery",
      section: "Folk & Tribal Arts",
      depth: 1,
      light: 0.4,
      palette: { wall: "#D97A2B", bg: "#241A2E" },
      map: [
        "########################",
        "#<....p.......p........#",
        "#......................#",
        "#...C.......h..........#",
        "#.....................>#",
        "########################",
      ],
      npc: {
        id: "patua",
        lines: ["These scrolls once told whole epics, panel by panel."],
      },
      pages: [
        {
          id: "p02",
          title: "Warli: The Geometry of Daily Life",
          surfaceImage: "/pages/p02-surface.svg",
          hiddenImage: "/pages/p02-hidden.svg",
          caption: "Maharashtra",
          archiveUrl: null,
          fragmentId: "f02",
        },
        {
          id: "p03",
          title: "Mithila Tales: Madhubani Today",
          surfaceImage: "/pages/p03-surface.svg",
          hiddenImage: null,
          caption: "Bihar",
          archiveUrl: null,
          fragmentId: "f03",
        },
        {
          id: "p04",
          title: "Bengal Patua Scrolls",
          surfaceImage: "/pages/p04-surface.svg",
          hiddenImage: "/pages/p04-hidden.svg",
          caption: "West Bengal",
          archiveUrl: null,
          fragmentId: "f04",
        },
        {
          id: "p05",
          title: "Chittara: Walls as Canvas",
          surfaceImage: "/pages/p05-surface.svg",
          hiddenImage: null,
          caption: "Karnataka",
          archiveUrl: null,
          fragmentId: "f05",
        },
      ],
    },
  ],
};
```

- [ ] **Step 6: Add a runtime check that logs a console error if the real config fails validation**

Add to the bottom of `src/content/magazine.config.js`:

```js
import { validateConfig } from "./validate-config.js";

const check = validateConfig(magazine);
if (!check.valid) {
  console.error("magazine.config.js is invalid:", check.errors);
}
```

- [ ] **Step 7: Run the full test suite and the dev server console check**

Run: `npx vitest run`
Expected: PASS (4 tests total so far).
Run: `npm run dev`, open in browser via the `run` skill, check the console — expected: no "magazine.config.js is invalid" error (5 pages, 1×5 fragments = 5, matches).

- [ ] **Step 8: Commit**

```bash
git add src/content/magazine.config.js src/content/validate-config.js tests/validate-config.test.js
git commit -m "Add magazine content config for the slice with rows*cols validation"
```

---

### Task 4: Placeholder content generator

**Files:**
- Create: `scripts/generate-placeholder-content.mjs`

**Interfaces:**
- Consumes: `magazine` from `src/content/magazine.config.js` (reads `tiers[].pages[]` for filenames, `fragments` for the final artwork grid).
- Produces: real `.svg` files on disk at every `surfaceImage`/`hiddenImage` path referenced in the config, plus `/public/art/final-artwork.svg`. Later tasks (reader UI, journal UI) load these as real `<img>` sources — no code in this task is imported by other tasks, it is a one-time generation step.

- [ ] **Step 1: Write the generator script**

```js
import { mkdirSync, writeFileSync } from "node:fs";
import { magazine } from "../src/content/magazine.config.js";

mkdirSync("public/pages", { recursive: true });
mkdirSync("public/art", { recursive: true });

const MOTIF_COLORS = ["#C9A24B", "#F6E7D2", "#2A1F14"];

function motifSvg(seed, tint, label) {
  const shapes = [];
  for (let i = 0; i < 12; i++) {
    const x = (seed * 37 + i * 53) % 480;
    const y = (seed * 71 + i * 29) % 640;
    const kind = i % 3;
    if (kind === 0) {
      shapes.push(`<circle cx="${x}" cy="${y}" r="6" fill="${MOTIF_COLORS[i % 3]}" />`);
    } else if (kind === 1) {
      shapes.push(`<polygon points="${x},${y} ${x + 14},${y} ${x + 7},${y - 14}" fill="${MOTIF_COLORS[(i + 1) % 3]}" />`);
    } else {
      shapes.push(`<rect x="${x}" y="${y}" width="10" height="10" fill="${MOTIF_COLORS[(i + 2) % 3]}" />`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">
  <rect width="480" height="640" fill="${tint}" />
  ${shapes.join("\n  ")}
  <text x="240" y="600" font-family="Georgia, serif" font-size="20" fill="#F6E7D2" text-anchor="middle">${label}</text>
</svg>`;
}

let seed = 1;
for (const tier of magazine.tiers) {
  for (const page of tier.pages) {
    writeFileSync(`public${page.surfaceImage}`, motifSvg(seed++, tier.palette.wall, page.title));
    if (page.hiddenImage) {
      writeFileSync(`public${page.hiddenImage}`, motifSvg(seed++, tier.palette.bg, `${page.title} (hidden)`));
    }
  }
}

const { rows, cols } = magazine.fragments;
const fragW = 480 / cols;
const fragH = 640 / rows;
const fragments = [];
let i = 0;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const hue = (i * 360) / (rows * cols);
    fragments.push(
      `<rect x="${c * fragW}" y="${r * fragH}" width="${fragW}" height="${fragH}" fill="hsl(${hue}, 55%, 45%)" stroke="#F6E7D2" stroke-width="2" />`
    );
    i++;
  }
}
writeFileSync(
  `public${magazine.fragments.image}`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">${fragments.join("\n")}</svg>`
);

console.log(`Generated ${seed - 1} page image(s) and 1 final artwork.`);
```

- [ ] **Step 2: Run it**

Run: `npm run gen:placeholders`
Expected: prints `Generated N page image(s) and 1 final artwork.` and creates files under `public/pages/` and `public/art/`.

- [ ] **Step 3: Verify file count matches config**

Run: `ls public/pages` (or `Get-ChildItem public/pages` on Windows PowerShell)
Expected: `p01-surface.svg`, `p02-surface.svg`, `p02-hidden.svg`, `p03-surface.svg`, `p04-surface.svg`, `p04-hidden.svg`, `p05-surface.svg` — 7 files. `public/art/final-artwork.svg` exists.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-placeholder-content.mjs public/pages public/art
git commit -m "Add placeholder content generator and generate placeholder page art"
```

---

### Task 5: Fragments / journal state system

**Files:**
- Create: `src/systems/fragments.js`
- Test: `tests/fragments.test.js`

**Interfaces:**
- Consumes: `state` from `src/state.js`; `magazine` from `src/content/magazine.config.js` (for total fragment count).
- Produces: `surfaceFragment(fragmentId)` → returns `{ alreadySurfaced: boolean, totalSurfaced: number, isComplete: boolean }`. `getSurfacedCount()` → number. `getTotalFragments()` → number (derived from config). `isJourneyComplete()` → boolean. These are the only functions later tasks (reader, HUD, journal, ending) use to read/mutate fragment state — none of them touch `state.fragmentsSurfaced` directly.

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, beforeEach } from "vitest";
import { resetState } from "../src/state.js";
import {
  surfaceFragment,
  getSurfacedCount,
  getTotalFragments,
  isJourneyComplete,
} from "../src/systems/fragments.js";

describe("fragments system", () => {
  beforeEach(() => resetState());

  it("reports total fragments from config (5 for this slice)", () => {
    expect(getTotalFragments()).toBe(5);
  });

  it("surfacing a new fragment increases the count and is not already-surfaced", () => {
    const result = surfaceFragment("f01");
    expect(result.alreadySurfaced).toBe(false);
    expect(result.totalSurfaced).toBe(1);
    expect(getSurfacedCount()).toBe(1);
  });

  it("surfacing the same fragment twice does not double-count", () => {
    surfaceFragment("f01");
    const second = surfaceFragment("f01");
    expect(second.alreadySurfaced).toBe(true);
    expect(getSurfacedCount()).toBe(1);
  });

  it("isJourneyComplete is true only once all 5 fragments are surfaced", () => {
    ["f01", "f02", "f03", "f04"].forEach(surfaceFragment);
    expect(isJourneyComplete()).toBe(false);
    const last = surfaceFragment("f05");
    expect(last.isComplete).toBe(true);
    expect(isJourneyComplete()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/fragments.test.js`
Expected: FAIL — `src/systems/fragments.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
import { state } from "../state.js";
import { magazine } from "../content/magazine.config.js";

export function getTotalFragments() {
  return magazine.tiers.reduce((sum, tier) => sum + tier.pages.length, 0);
}

export function getSurfacedCount() {
  return state.fragmentsSurfaced.size;
}

export function isJourneyComplete() {
  return getSurfacedCount() >= getTotalFragments();
}

export function surfaceFragment(fragmentId) {
  const alreadySurfaced = state.fragmentsSurfaced.has(fragmentId);
  if (!alreadySurfaced) {
    state.fragmentsSurfaced.add(fragmentId);
  }
  return {
    alreadySurfaced,
    totalSurfaced: getSurfacedCount(),
    isComplete: isJourneyComplete(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/fragments.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/fragments.js tests/fragments.test.js
git commit -m "Add fragments/journal state system with surfacing logic"
```

---

### Task 6: Title scene + boot flow

**Files:**
- Modify: `src/main.js`
- Create: `src/scenes/title.js`

**Interfaces:**
- Consumes: global Kaplay functions (`scene`, `add`, `text`, `pos`, `anchor`, `color`, `onKeyPress`, `onClick`, `go`, `width`, `height`) set up by `kaplay({ global: true })` in `main.js`.
- Produces: `export function registerTitleScene()` which calls `scene("title", ...)`. `main.js` calls this before `go("title")`. Later tasks add `registerTierScene()` and `registerEndingScene()` the same way.

- [ ] **Step 1: Write `src/scenes/title.js`**

```js
export function registerTitleScene() {
  scene("title", () => {
    add([
      rect(width(), height()),
      pos(0, 0),
      color(20, 18, 30),
    ]);

    add([
      text("Anvesha", { size: 64 }),
      pos(width() / 2, height() / 2 - 60),
      anchor("center"),
      color(252, 222, 90),
    ]);

    add([
      text("The Stepwell of Anvesha", { size: 22 }),
      pos(width() / 2, height() / 2 - 10),
      anchor("center"),
      color(201, 162, 75),
    ]);

    const prompt = add([
      text("Press Space or click to begin the Anvesha", { size: 16 }),
      pos(width() / 2, height() / 2 + 60),
      anchor("center"),
      color(246, 231, 210),
      opacity(1),
    ]);

    prompt.onUpdate(() => {
      prompt.opacity = 0.6 + 0.4 * Math.abs(Math.sin(time() * 2));
    });

    function begin() {
      go("tier", "surface");
    }

    onKeyPress("space", begin);
    onClick(begin);
  });
}
```

- [ ] **Step 2: Modify `src/main.js` to register and boot into the title scene**

Replace the file's `scene("boot", ...)` block and `go("boot")` call with:

```js
import kaplay from "kaplay";
import { registerTitleScene } from "./scenes/title.js";

const k = kaplay({
  width: 960,
  height: 540,
  letterbox: true,
  background: [20, 18, 30],
  global: true,
});

setGravity(0);

registerTitleScene();

go("title");

export default k;
```

- [ ] **Step 3: Verify it runs**

Run: `npm run dev`, open via the `run` skill. Confirm: title text pulses gently, pressing Space or clicking attempts to go to scene `"tier"` (this will error with "scene not found" until Task 7 — expected at this point; confirm the title screen itself renders correctly and the error only appears after interacting).

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/scenes/title.js
git commit -m "Add title scene with pulsing prompt"
```

---

### Task 7: Generic tier scene — map, Seeker movement, collision, camera

**Files:**
- Create: `src/systems/level.js`
- Create: `src/entities/seeker.js`
- Create: `src/scenes/tier.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `magazine` from `src/content/magazine.config.js`; `state` from `src/state.js`.
- Produces: `buildLevel(tierConfig)` (in `level.js`) → returns the Kaplay level game object, having already spawned wall tiles, the Seeker (tagged `"seeker"`), and stair tiles (tagged `"stairs-down"`/`"stairs-up"`). `spawnSeeker(x, y)` (in `seeker.js`) → returns the Seeker game object with movement wired to WASD/arrows. `registerTierScene()` (in `tier.js`) calls `scene("tier", (tierId) => {...})`, looks up the tier by id in `magazine.tiers`, calls `buildLevel`, sets `state.currentTier = tierId`, and makes the camera follow the Seeker. Later tasks (NPC, interaction, lantern) add to this same scene body.

- [ ] **Step 1: Write `src/entities/seeker.js`**

```js
const SPEED = 200;

export function spawnSeeker(x, y) {
  const seeker = add([
    rect(20, 28),
    pos(x, y),
    anchor("center"),
    area(),
    body(),
    color(252, 222, 90),
    "seeker",
  ]);

  seeker.onUpdate(() => {
    let dx = 0;
    let dy = 0;
    if (isKeyDown("left") || isKeyDown("a")) dx -= 1;
    if (isKeyDown("right") || isKeyDown("d")) dx += 1;
    if (isKeyDown("up") || isKeyDown("w")) dy -= 1;
    if (isKeyDown("down") || isKeyDown("s")) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      seeker.move((dx / len) * SPEED, (dy / len) * SPEED);
    }
  });

  return seeker;
}
```

- [ ] **Step 2: Write `src/systems/level.js`**

```js
const TILE_SIZE = 32;

export function buildLevel(tierConfig) {
  let seekerSpawn = null;

  const level = addLevel(tierConfig.map, {
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    tiles: {
      "#": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        body({ isStatic: true }),
        color(...hexToRgbTuple(tierConfig.palette.wall)),
        "wall",
      ],
      ">": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        color(...hexToRgbTuple(tierConfig.palette.wall)),
        opacity(0.6),
        "stairs-down",
      ],
      "<": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        color(...hexToRgbTuple(tierConfig.palette.wall)),
        opacity(0.6),
        "stairs-up",
      ],
    },
  });

  for (let row = 0; row < tierConfig.map.length; row++) {
    const col = tierConfig.map[row].indexOf("S");
    if (col !== -1) {
      seekerSpawn = { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
    }
  }

  return { level, seekerSpawn };
}

function hexToRgbTuple(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}
```

- [ ] **Step 3: Write `src/scenes/tier.js`**

```js
import { magazine } from "../content/magazine.config.js";
import { state } from "../state.js";
import { buildLevel } from "../systems/level.js";
import { spawnSeeker } from "../entities/seeker.js";

export function registerTierScene() {
  scene("tier", (tierId) => {
    const tierConfig = magazine.tiers.find((t) => t.id === tierId);
    if (!tierConfig) {
      throw new Error(`Unknown tier id: ${tierId}`);
    }
    state.currentTier = tierId;

    add([
      rect(width() * 4, height() * 4),
      pos(-width(), -height()),
      color(...hexBg(tierConfig.palette.bg)),
    ]);

    const { seekerSpawn } = buildLevel(tierConfig);
    const seeker = spawnSeeker(seekerSpawn.x, seekerSpawn.y);

    seeker.onUpdate(() => {
      camPos(seeker.pos);
    });

    seeker.onCollide("stairs-down", () => {
      const nextTier = getNextTierId(tierId);
      if (nextTier) go("tier", nextTier);
      else go("ending");
    });

    seeker.onCollide("stairs-up", () => {
      const prevTier = getPrevTierId(tierId);
      if (prevTier) go("tier", prevTier);
    });
  });
}

function getNextTierId(currentId) {
  const idx = magazine.tiers.findIndex((t) => t.id === currentId);
  return magazine.tiers[idx + 1]?.id ?? null;
}

function getPrevTierId(currentId) {
  const idx = magazine.tiers.findIndex((t) => t.id === currentId);
  return magazine.tiers[idx - 1]?.id ?? null;
}

function hexBg(hex) {
  const clean = hex.replace("#", "");
  return [parseInt(clean.substring(0, 2), 16), parseInt(clean.substring(2, 4), 16), parseInt(clean.substring(4, 6), 16)];
}
```

- [ ] **Step 4: Modify `src/main.js` to register the tier scene**

```js
import kaplay from "kaplay";
import { registerTitleScene } from "./scenes/title.js";
import { registerTierScene } from "./scenes/tier.js";

const k = kaplay({
  width: 960,
  height: 540,
  letterbox: true,
  background: [20, 18, 30],
  global: true,
});

setGravity(0);

registerTitleScene();
registerTierScene();

go("title");

export default k;
```

- [ ] **Step 5: Verify it runs**

Run: `npm run dev`, open via the `run` skill. From the title screen, press Space. Confirm: the Surface tier map renders with gold walls, the Seeker (gold square) spawns and moves with WASD/arrows, collides with walls (cannot walk through `#`), camera follows the Seeker, and walking into the `>` tile transitions to the Folk Arts Gallery tier (will look identical in wall color until Task 14 differentiates tiers further — confirm the scene swap itself happens, no console errors).

- [ ] **Step 6: Commit**

```bash
git add src/entities/seeker.js src/systems/level.js src/scenes/tier.js src/main.js
git commit -m "Add generic tier scene with Seeker movement, wall collision, camera follow, and stair transitions"
```

---

### Task 8: NPC entity + dialogue UI

**Files:**
- Create: `src/entities/npc.js`
- Create: `src/ui/dialogue.js`
- Modify: `src/scenes/tier.js`
- Modify: `src/systems/level.js`
- Modify: `src/styles/ui.css`

**Interfaces:**
- Consumes: `tierConfig.npc` from `magazine.config.js`; design tokens from `tokens.css`.
- Produces: `spawnNpc(x, y)` (in `npc.js`) → returns the NPC game object tagged `"npc"`, idle-bobbing, turning to face the Seeker in range, exposing `.isSeekerInRange()`. NPC dialogue lines are not stored on the NPC object itself — `tier.js` reads `tierConfig.npc.lines` directly and passes them to `openDialogue`. `openDialogue(lines)` / `closeDialogue()` (in `dialogue.js`) → manage the `#dialogue-root` DOM panel, cycling through `lines` on repeated calls, styled with the shared folk-art motif border. `tier.js` wires `E`/Space interaction: when the Seeker is near the NPC, pressing the interact key calls `openDialogue(tierConfig.npc.lines)`.

- [ ] **Step 1: Add the `C` tile to `src/systems/level.js`'s `buildLevel`, capturing NPC spawn position**

Add inside the `tiles` object (alongside `"#"`, `">"`, `"<"`): nothing — `C` is not a static tile, it marks a spawn point only, parsed the same way `S` is. Add this after the existing `seekerSpawn` loop in `buildLevel`:

```js
  let npcSpawn = null;
  for (let row = 0; row < tierConfig.map.length; row++) {
    const col = tierConfig.map[row].indexOf("C");
    if (col !== -1) {
      npcSpawn = { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
    }
  }

  return { level, seekerSpawn, npcSpawn };
```

(This replaces the previous `return { level, seekerSpawn };` line.)

- [ ] **Step 2: Write `src/entities/npc.js`**

```js
const INTERACT_RANGE = 60;

export function spawnNpc(x, y) {
  const npc = add([
    rect(20, 28),
    pos(x, y),
    anchor("center"),
    area(),
    color(201, 162, 75),
    "npc",
  ]);

  let bobT = 0;
  npc.onUpdate(() => {
    bobT += dt();
    npc.pos.y += Math.sin(bobT * 3) * 0.15;

    const seeker = get("seeker")[0];
    if (seeker) {
      const facingRight = seeker.pos.x > npc.pos.x;
      npc.flipX = facingRight;
    }
  });

  npc.isSeekerInRange = () => {
    const seeker = get("seeker")[0];
    if (!seeker) return false;
    return seeker.pos.dist(npc.pos) <= INTERACT_RANGE;
  };

  return npc;
}
```

- [ ] **Step 3: Write `src/ui/dialogue.js`**

```js
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
```

- [ ] **Step 4: Add the shared folk-art motif border and dialogue styles to `src/styles/ui.css`**

This introduces `.folk-border`, the single reusable visual motif (a repeating dot pattern as a CSS `border-image`, generated as an inline SVG data URI — no external asset or network request) that the dialogue box, reader card, journal card, and HUD counter all share so they read as one designed system rather than four separately-styled panels:

```css
.folk-border {
  border-style: solid;
  border-width: 12px;
  border-image-slice: 12;
  border-image-repeat: round;
  border-image-source: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect width='24' height='24' fill='none'/><circle cx='12' cy='6' r='3' fill='%23C9A24B'/><circle cx='6' cy='18' r='3' fill='%23C9A24B'/><circle cx='18' cy='18' r='3' fill='%23C9A24B'/></svg>");
}

#dialogue-root {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: none;
  justify-content: center;
  padding: 24px;
  pointer-events: none;
  z-index: 20;
}

#dialogue-root.visible {
  display: flex;
}

.dialogue-box {
  background: var(--overlay-dark);
  border-radius: 8px;
  padding: 16px 24px;
  max-width: 560px;
  color: var(--archival-ivory);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 18px;
  text-align: center;
}

.dialogue-hint {
  display: block;
  margin-top: 8px;
  font-family: system-ui, sans-serif;
  font-size: 12px;
  color: var(--linework-gold);
}
```

- [ ] **Step 5: Wire NPC spawn + interaction into `src/scenes/tier.js`**

Add these imports at the top of `tier.js`, alongside the existing ones:

```js
import { spawnNpc } from "../entities/npc.js";
import { openDialogue, closeDialogue, isDialogueOpen } from "../ui/dialogue.js";
```

Change `const { seekerSpawn } = buildLevel(tierConfig);` (from Task 7) to:

```js
    const { seekerSpawn, npcSpawn } = buildLevel(tierConfig);
```

Then, immediately after `const seeker = spawnSeeker(seekerSpawn.x, seekerSpawn.y);`, add:

```js
    const npc = npcSpawn ? spawnNpc(npcSpawn.x, npcSpawn.y) : null;

    onKeyPress("e", () => {
      if (isDialogueOpen()) {
        closeDialogue();
        return;
      }
      if (npc && npc.isSeekerInRange()) {
        openDialogue(tierConfig.npc.lines);
      }
    });

    onKeyPress("escape", () => {
      if (isDialogueOpen()) closeDialogue();
    });
```

- [ ] **Step 6: Verify it runs**

Run: `npm run dev`, open via the `run` skill. Confirm: the Custodian (gold-tinted square) appears on the Surface tier, idle-bobs continuously, flips to face the Seeker when approached. Walk close and press `E` — the dialogue box appears with the first line in the archival-styled panel; press `E` again to cycle through remaining lines; press `Esc` to close.

- [ ] **Step 7: Commit**

```bash
git add src/entities/npc.js src/ui/dialogue.js src/systems/level.js src/scenes/tier.js src/styles/ui.css
git commit -m "Add NPC entity with idle bob/facing and dialogue UI with folk-art styling"
```

---

### Task 9: Interaction system + lit page markers

**Files:**
- Create: `src/systems/interaction.js`
- Modify: `src/systems/level.js`
- Modify: `src/scenes/tier.js`

**Interfaces:**
- Consumes: `tierConfig.pages` from `magazine.config.js`.
- Produces: `level.js`'s `buildLevel` now also spawns `"p"` tiles as lit page markers (tagged `"page-marker"`, carrying a `.pageData` property pointing at the matching entry in `tierConfig.pages`, matched in map-order) and `"h"` tiles as hidden page markers (tagged `"page-marker"` and `"hidden-marker"`, initially `opacity(0)` and not yet interactable — Task 13 wires the lantern reveal). `setupInteraction(seeker, onOpenPage)` (in `interaction.js`) → polls proximity each frame and calls `onOpenPage(pageData)` when the Seeker is near a marker and presses `E`. `tier.js` passes a callback that will open the reader (stubbed with `console.log` in this task; Task 11 replaces the stub).

- [ ] **Step 1: Extend `src/systems/level.js`'s `buildLevel` to spawn page markers**

Add a counter and two new tile handlers inside the `tiles` object passed to `addLevel` (alongside `"#"`, `">"`, `"<"`):

```js
let pageCursor = 0;
const litPages = tierConfig.pages.filter((p) => true);
```

Replace the whole function body of `buildLevel` with this version (it keeps every line from Task 7/8 and adds marker spawning):

```js
export function buildLevel(tierConfig) {
  let pageCursor = 0;

  const level = addLevel(tierConfig.map, {
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    tiles: {
      "#": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        body({ isStatic: true }),
        color(...hexToRgbTuple(tierConfig.palette.wall)),
        "wall",
      ],
      ">": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        color(...hexToRgbTuple(tierConfig.palette.wall)),
        opacity(0.6),
        "stairs-down",
      ],
      "<": () => [
        rect(TILE_SIZE, TILE_SIZE),
        area(),
        color(...hexToRgbTuple(tierConfig.palette.wall)),
        opacity(0.6),
        "stairs-up",
      ],
      "p": () => {
        const pageData = tierConfig.pages[pageCursor++];
        return [
          circle(8),
          area(),
          color(252, 222, 90),
          "page-marker",
          { pageData },
        ];
      },
      "h": () => {
        const pageData = tierConfig.pages[pageCursor++];
        return [
          circle(8),
          area(),
          color(252, 222, 90),
          opacity(0),
          "page-marker",
          "hidden-marker",
          { pageData },
        ];
      },
    },
  });

  let seekerSpawn = null;
  let npcSpawn = null;
  for (let row = 0; row < tierConfig.map.length; row++) {
    const sCol = tierConfig.map[row].indexOf("S");
    if (sCol !== -1) seekerSpawn = { x: sCol * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
    const cCol = tierConfig.map[row].indexOf("C");
    if (cCol !== -1) npcSpawn = { x: cCol * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
  }

  return { level, seekerSpawn, npcSpawn };
}
```

Note: page markers are matched to `tierConfig.pages` strictly in the order they appear scanning the map top-to-bottom, left-to-right — this means the order of `p`/`h` characters in each tier's `map` array in `magazine.config.js` must match the order of that tier's `pages` array. This is already true for the config written in Task 3 (`folk-arts` map has `p`, `p`, `h` in reading order, but its `pages` array is `p02, p03, p04, p05` with `p04` flagged `hiddenImage` — the map's third marker (`h`) must correspond to a page with a `hiddenImage`). Fix the `folk-arts` tier's `map` in `magazine.config.js` to place markers in this exact order: `p` (p02), `p` (p03), `h` (p04 — hidden), and add one more `p` (p05) reachable in the open. Update the map to:

```js
      map: [
        "########################",
        "#<....p.......p........#",
        "#......................#",
        "#...C.......h........p.#",
        "#.....................>#",
        "########################",
      ],
```

- [ ] **Step 2: Write `src/systems/interaction.js`**

```js
const INTERACT_RANGE = 40;

export function setupInteraction(seeker, onOpenPage) {
  onKeyPress("e", () => {
    const markers = get("page-marker");
    for (const marker of markers) {
      if (marker.is("hidden-marker") && marker.opacity < 0.5) continue;
      if (seeker.pos.dist(marker.pos) <= INTERACT_RANGE) {
        onOpenPage(marker.pageData);
        return;
      }
    }
  });
}
```

- [ ] **Step 3: Wire it into `src/scenes/tier.js`**

Add the import:

```js
import { setupInteraction } from "../systems/interaction.js";
```

After the NPC/`onKeyPress("e", ...)` block from Task 8, the `E` key is already used for dialogue. Change the Task 8 handler so it only handles NPC dialogue, and add a separate call to `setupInteraction` for pages — but Kaplay's `onKeyPress` can have multiple listeners for the same key, so add this as an additional, independent call rather than merging logic:

```js
    setupInteraction(seeker, (pageData) => {
      console.log("Opening page:", pageData.title);
    });
```

- [ ] **Step 4: Verify it runs**

Run: `npm run dev`, open via the `run` skill. Walk the Seeker to an open (`p`) marker on either tier, press `E`, confirm the browser console logs `Opening page: <title>` matching the marker's config entry. Confirm hidden (`h`) markers are invisible and do not respond to `E` yet (expected — Task 13 makes them appear).

- [ ] **Step 5: Commit**

```bash
git add src/systems/level.js src/systems/interaction.js src/scenes/tier.js src/content/magazine.config.js
git commit -m "Add page markers and proximity interaction system"
```

---

### Task 10: Audio system (synthesized SFX, mute toggle)

**Files:**
- Create: `src/systems/audio.js`

**Interfaces:**
- Consumes: `state` from `src/state.js` (for `audioMuted`).
- Produces: `playFootstep()`, `playPageOpen()`, `playFragmentChime()`, `playDescentRumble()`, `playCompletionSwell()`, `toggleMute()`, `isMuted()` — all using the Web Audio API directly (no audio files). Every later task that needs a sound effect calls one of these named functions; nothing else touches `AudioContext` directly. The context is created lazily on the first call, inside a user-gesture handler, satisfying autoplay policy.

- [ ] **Step 1: Write `src/systems/audio.js`**

```js
import { state } from "../state.js";

let ctx = null;

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

function blip({ freq, duration, type = "sine", gainPeak = 0.2 }) {
  if (state.audioMuted) return;
  const audioCtx = getContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(gainPeak, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function playFootstep() {
  blip({ freq: 180, duration: 0.08, type: "square", gainPeak: 0.05 });
}

export function playPageOpen() {
  blip({ freq: 440, duration: 0.25, type: "sine", gainPeak: 0.15 });
}

export function playFragmentChime() {
  blip({ freq: 880, duration: 0.4, type: "sine", gainPeak: 0.2 });
  setTimeout(() => blip({ freq: 1320, duration: 0.3, type: "sine", gainPeak: 0.15 }), 120);
}

export function playDescentRumble() {
  blip({ freq: 90, duration: 0.6, type: "sawtooth", gainPeak: 0.12 });
}

export function playCompletionSwell() {
  [660, 880, 1100].forEach((freq, i) => {
    setTimeout(() => blip({ freq, duration: 0.8, type: "sine", gainPeak: 0.18 }), i * 150);
  });
}

export function toggleMute() {
  state.audioMuted = !state.audioMuted;
  return state.audioMuted;
}

export function isMuted() {
  return state.audioMuted;
}
```

- [ ] **Step 2: Add a temporary debug trigger to verify by ear**

In `src/scenes/title.js`, inside the `begin()` function, before `go("tier", "surface")`, add:

```js
import { playPageOpen } from "../systems/audio.js";
```

(import at top of file) and call `playPageOpen();` as the first line of `begin()`.

- [ ] **Step 3: Wire footstep SFX into Seeker movement in `src/entities/seeker.js`**

Add the import at the top:

```js
import { playFootstep } from "../systems/audio.js";
```

Add a module-level timer and trigger it inside the existing movement block. Replace:

```js
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      seeker.move((dx / len) * SPEED, (dy / len) * SPEED);
    }
```

with:

```js
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      seeker.move((dx / len) * SPEED, (dy / len) * SPEED);
      footstepTimer -= dt();
      if (footstepTimer <= 0) {
        playFootstep();
        footstepTimer = 0.3;
      }
    }
```

And add `let footstepTimer = 0;` at the top of `spawnSeeker`, before `const seeker = add([...`.

- [ ] **Step 4: Verify it runs**

Run: `npm run dev`, open via the `run` skill with sound on. Click or press Space on the title screen — confirm an audible short chime plays (this confirms the AudioContext unlocks correctly on first gesture) before the scene transition. Walk the Seeker around — confirm a soft footstep tick repeats roughly 3 times per second while moving and stops the instant movement stops. No console errors about suspended/blocked audio context.

- [ ] **Step 5: Commit**

```bash
git add src/systems/audio.js src/scenes/title.js src/entities/seeker.js
git commit -m "Add synthesized Web Audio SFX system with mute support and footstep wiring"
```

---

### Task 11: Page reader UI — archival framing, zoom/pan, corner-peel reveal

**Files:**
- Create: `src/ui/reader.js`
- Modify: `src/styles/ui.css`
- Modify: `src/scenes/tier.js`

**Interfaces:**
- Consumes: `pageData` objects shaped `{ id, title, surfaceImage, hiddenImage, caption, archiveUrl, fragmentId }`; `playPageOpen` from `audio.js`; GSAP (`gsap` import).
- Produces: `openReader(pageData, onFirstRead)` → renders `#reader-root`, calling `onFirstRead(pageData)` exactly once the first time this `pageData.id` is opened (later tasks pass a callback that surfaces the fragment). `closeReader()` → tears down `#reader-root` and returns focus to the game. `isReaderOpen()` → boolean. `tier.js`'s page-open callback (the `console.log` stub from Task 9) is replaced with a real call to `openReader`.

- [ ] **Step 1: Add reader styles to `src/styles/ui.css`**

The `.reader-card` reuses `.folk-border` (defined in Task 8) for its frame, rather than its own border declaration:

```css
#reader-root {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: var(--overlay-dark);
  z-index: 30;
}

#reader-root.visible {
  display: flex;
}

.reader-card {
  position: relative;
  width: min(90vw, 520px);
  height: min(85vh, 720px);
  background: var(--archival-ivory);
  border-radius: 4px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-image-wrap {
  position: relative;
  flex: 1;
  overflow: hidden;
  cursor: grab;
}

.reader-image-wrap img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: center center;
}

.reader-image-wrap img.hidden-layer {
  clip-path: polygon(0 0, 0 0, 0 0);
}

.reader-caption-plate {
  padding: 10px 16px;
  background: var(--ink);
  color: var(--archival-ivory);
  font-family: Georgia, serif;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reader-peel-hint {
  position: absolute;
  bottom: 70px;
  right: 16px;
  color: var(--ink);
  background: rgba(246, 231, 210, 0.85);
  border: 1px solid var(--linework-gold);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: system-ui, sans-serif;
}

.reader-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--ink);
  color: var(--archival-ivory);
  font-size: 18px;
  cursor: pointer;
  z-index: 5;
}
```

- [ ] **Step 2: Write `src/ui/reader.js`**

```js
import gsap from "gsap";
import { playPageOpen } from "../systems/audio.js";

const readPageIds = new Set();
let currentPageData = null;
let zoom = 1;

export function isReaderOpen() {
  return document.getElementById("reader-root").classList.contains("visible");
}

export function openReader(pageData, onFirstRead) {
  currentPageData = pageData;
  zoom = 1;
  playPageOpen();

  const root = document.getElementById("reader-root");
  const hasHidden = Boolean(pageData.hiddenImage);

  root.innerHTML = `
    <div class="reader-card folk-border">
      <button class="reader-close" aria-label="Close">×</button>
      <div class="reader-image-wrap">
        <img class="surface-layer" src="${pageData.surfaceImage}" alt="${pageData.title}" />
        ${hasHidden ? `<img class="hidden-layer" src="${pageData.hiddenImage}" alt="${pageData.title} hidden layer" />` : ""}
      </div>
      ${hasHidden ? `<div class="reader-peel-hint">Drag or click a corner to lift the page</div>` : ""}
      <div class="reader-caption-plate">
        <span>${pageData.caption}</span>
        <span>${pageData.title}</span>
      </div>
    </div>
  `;
  root.classList.add("visible");

  root.querySelector(".reader-close").addEventListener("click", closeReader);

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
}
```

- [ ] **Step 3: Wire `openReader`/`closeReader` into `src/scenes/tier.js`**

Add the import:

```js
import { openReader, closeReader, isReaderOpen } from "../ui/reader.js";
```

Replace the Task 9 stub:

```js
    setupInteraction(seeker, (pageData) => {
      console.log("Opening page:", pageData.title);
    });
```

with:

```js
    setupInteraction(seeker, (pageData) => {
      openReader(pageData, () => {});
    });

    onKeyPress("escape", () => {
      if (isReaderOpen()) {
        closeReader();
        return;
      }
      if (isDialogueOpen()) closeDialogue();
    });
```

(This adds a second `escape` handler; Kaplay supports multiple listeners per key, both will run — the dialogue-close `escape` handler from Task 8 stays as-is alongside this one. The empty `() => {}` first-read callback above is intentionally a no-op here — Task 12 replaces it with the real fragment-surfacing call.)

- [ ] **Step 4: Verify it runs**

Run: `npm run dev`, open via the `run` skill. Open `p01` (single-layer) — confirm the archival reader card shows the placeholder SVG, caption plate reads correctly, scroll wheel zooms, close button and `Esc` both close it. Open `p02` or `p04` (layered) — confirm the "lift the page" hint appears and clicking the image animates the hidden layer sliding into view via the clip-path peel.

- [ ] **Step 5: Commit**

```bash
git add src/ui/reader.js src/styles/ui.css src/scenes/tier.js
git commit -m "Add page reader UI with archival framing, zoom, and corner-peel reveal"
```

---

### Task 12: Fragment integration + HUD + fragment-flight animation

**Files:**
- Create: `src/ui/hud.js`
- Create: `src/ui/journal.js`
- Modify: `src/ui/reader.js`
- Modify: `src/styles/ui.css`
- Modify: `src/scenes/tier.js`

**Interfaces:**
- Consumes: `surfaceFragment`, `getSurfacedCount`, `getTotalFragments` from `src/systems/fragments.js`; `playFragmentChime`, `toggleMute`, `isMuted` from `audio.js`; `magazine.fragments` for the journal grid; GSAP.
- Produces: `mountHud()` (in `hud.js`) → renders `#hud-root` once per tier scene with the `Surfaced: X / N` counter, a mute button, and a journal button; `updateHudCount()` → re-renders the counter with a bounce-pulse. `openJournal()` / `closeJournal()` (in `journal.js`) → show/hide `#journal-root`, an assembling-grid view with filled/empty slots per fragment. `reader.js`'s `openFirstRead` callback now calls `surfaceFragment`, plays the chime, and runs the GSAP fly-to-journal animation before calling `updateHudCount()`.

- [ ] **Step 1: Add HUD + journal styles to `src/styles/ui.css`**

`.journal-card` reuses `.folk-border` (defined in Task 8) for its frame, matching the dialogue box and reader card. The HUD counter pill keeps its own simple border since `.folk-border`'s rectangular pattern doesn't suit a small rounded pill shape.

```css
#hud-root {
  position: fixed;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
  pointer-events: none;
}

.hud-counter {
  pointer-events: auto;
  background: var(--overlay-dark);
  border: 2px solid var(--linework-gold);
  color: var(--archival-ivory);
  font-family: Georgia, serif;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 14px;
}

.hud-buttons {
  pointer-events: auto;
  display: flex;
  gap: 8px;
}

.hud-buttons button {
  background: var(--overlay-dark);
  border: 2px solid var(--linework-gold);
  color: var(--archival-ivory);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  cursor: pointer;
  font-size: 16px;
}

#journal-root {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: var(--overlay-dark);
  z-index: 25;
}

#journal-root.visible {
  display: flex;
}

.journal-card {
  background: var(--archival-ivory);
  border-radius: 4px;
  padding: 24px;
  display: grid;
  gap: 4px;
  position: relative;
}

.journal-slot {
  width: 64px;
  height: 64px;
  background: var(--ink);
  border: 1px solid var(--linework-gold);
  opacity: 0.25;
}

.journal-slot.filled {
  opacity: 1;
}

.journal-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--ink);
  color: var(--archival-ivory);
  cursor: pointer;
}

#fragment-flight-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 28;
}

.flying-fragment {
  position: fixed;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--diya-gold);
  box-shadow: 0 0 12px var(--diya-gold);
}
```

- [ ] **Step 2: Write `src/ui/hud.js`**

```js
import { getSurfacedCount, getTotalFragments } from "../systems/fragments.js";
import { toggleMute, isMuted } from "../systems/audio.js";
import { openJournal } from "./journal.js";
import gsap from "gsap";

export function mountHud() {
  const root = document.getElementById("hud-root");
  root.innerHTML = `
    <div class="hud-counter" id="hud-counter">Surfaced: ${getSurfacedCount()} / ${getTotalFragments()}</div>
    <div class="hud-buttons">
      <button id="hud-mute">${isMuted() ? "🔇" : "🔊"}</button>
      <button id="hud-journal">📖</button>
    </div>
  `;
  document.getElementById("hud-mute").addEventListener("click", () => {
    const muted = toggleMute();
    document.getElementById("hud-mute").textContent = muted ? "🔇" : "🔊";
  });
  document.getElementById("hud-journal").addEventListener("click", openJournal);
}

export function updateHudCount() {
  const counter = document.getElementById("hud-counter");
  if (!counter) return;
  counter.textContent = `Surfaced: ${getSurfacedCount()} / ${getTotalFragments()}`;
  gsap.fromTo(counter, { scale: 1 }, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1, ease: "power1.inOut" });
}

export function getHudJournalButtonRect() {
  return document.getElementById("hud-journal").getBoundingClientRect();
}
```

- [ ] **Step 3: Write `src/ui/journal.js`**

```js
import { state } from "../state.js";
import { magazine } from "../content/magazine.config.js";

export function openJournal() {
  const root = document.getElementById("journal-root");
  const { rows, cols } = magazine.fragments;
  const allFragmentIds = magazine.tiers.flatMap((t) => t.pages.map((p) => p.fragmentId));

  const slots = allFragmentIds
    .map((id) => `<div class="journal-slot ${state.fragmentsSurfaced.has(id) ? "filled" : ""}" data-fragment="${id}"></div>`)
    .join("");

  root.innerHTML = `
    <div class="journal-card folk-border" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
      <button class="journal-close">×</button>
      ${slots}
    </div>
  `;
  root.classList.add("visible");
  root.querySelector(".journal-close").addEventListener("click", closeJournal);
}

export function closeJournal() {
  const root = document.getElementById("journal-root");
  root.classList.remove("visible");
  root.innerHTML = "";
}

export function isJournalOpen() {
  return document.getElementById("journal-root").classList.contains("visible");
}
```

- [ ] **Step 4: Add `#fragment-flight-root` to `index.html`**

In `index.html`, add `<div id="fragment-flight-root"></div>` right after `<div id="hud-root"></div>`.

- [ ] **Step 5: Modify `src/ui/reader.js` to accept a flight-animation callback and trigger it on first read**

Change the `openReader` signature and first-read block:

```js
export function openReader(pageData, onFirstRead) {
```

stays the same signature — `onFirstRead` is now expected to be a function that performs fragment surfacing AND the flight animation, supplied by `tier.js`. No change needed inside `reader.js` itself beyond what Task 11 already wrote, since `onFirstRead(pageData)` already fires once per page id. Skip this step's file edit; the wiring lives in `tier.js` (Step 6).

- [ ] **Step 6: Wire fragment surfacing + flight animation + HUD into `src/scenes/tier.js`**

Add imports:

```js
import gsap from "gsap";
import { surfaceFragment } from "../systems/fragments.js";
import { playFragmentChime } from "../systems/audio.js";
import { mountHud, updateHudCount, getHudJournalButtonRect } from "../ui/hud.js";
```

After `const npc = npcSpawn ? spawnNpc(npcSpawn.x, npcSpawn.y) : null;`, add:

```js
    mountHud();
```

Replace the Task 11 reader wiring:

```js
    setupInteraction(seeker, (pageData) => {
      openReader(pageData, () => {});
    });
```

with:

```js
    setupInteraction(seeker, (pageData) => {
      openReader(pageData, () => {
        surfaceFragment(pageData.fragmentId);
        playFragmentChime();
        flyFragmentToJournal();
        updateHudCount();
      });
    });
```

And add this helper function near the bottom of `tier.js` (outside `registerTierScene`, as a module-level function):

```js
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
```

- [ ] **Step 7: Verify it runs**

Run: `npm run dev`, open via the `run` skill. Confirm the HUD shows `Surfaced: 0 / 5` on entering the Surface tier. Open page `p01` and close the reader — confirm: the chime plays, a glowing dot arcs from the reader card's last position to the journal button, the HUD counter bounce-pulses and updates to `Surfaced: 1 / 5`. Click the journal button — confirm a grid of 5 slots appears with exactly 1 filled. Re-opening `p01` again must NOT re-trigger the flight/chime/count increase (idempotent first-read).

- [ ] **Step 8: Commit**

```bash
git add src/ui/hud.js src/ui/journal.js src/scenes/tier.js src/styles/ui.css index.html
git commit -m "Wire fragment surfacing into HUD, journal grid, and fragment-flight animation"
```

---

### Task 13: Lantern / light-reveal system

**Files:**
- Create: `src/systems/lantern.js`
- Modify: `src/styles/ui.css`
- Modify: `src/scenes/tier.js`

**Interfaces:**
- Consumes: `seeker` game object, `tierConfig.light` (0–1) from `magazine.config.js`, `"hidden-marker"`-tagged objects spawned by `level.js` (Task 9).
- Produces: `setupLantern(seeker, tierConfig)` — call once per tier scene, after the Seeker is spawned. No return value; it attaches an `onUpdate` to the Seeker that drives both the DOM darkness overlay and the proximity-based opacity of hidden markers. This is visual/runtime behavior with no meaningful unit-testable surface — verified by running and playing, per the spec's verification approach.

- [ ] **Step 1: Add lantern overlay styles to `src/styles/ui.css`**

```css
#lantern-overlay {
  position: fixed;
  inset: 0;
  z-index: 15;
  pointer-events: none;
  display: none;
}
```

- [ ] **Step 2: Write `src/systems/lantern.js`**

```js
const LANTERN_WORLD_RADIUS = 140;
let nearHidden = false;

export function setupLantern(seeker, tierConfig) {
  const overlay = document.getElementById("lantern-overlay");
  const darkness = 1 - tierConfig.light;

  if (darkness <= 0.05) {
    overlay.style.display = "none";
    return;
  }

  overlay.style.display = "block";
  const baseRadius = 90 + tierConfig.light * 60;

  seeker.onUpdate(() => {
    nearHidden = false;
    for (const marker of get("hidden-marker")) {
      const dist = seeker.pos.dist(marker.pos);
      if (dist < LANTERN_WORLD_RADIUS) {
        marker.opacity = Math.max(0, 1 - dist / LANTERN_WORLD_RADIUS);
        if (marker.opacity > 0.3) nearHidden = true;
      } else {
        marker.opacity = 0;
      }
    }

    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const breatheSpeed = nearHidden ? 5 : 2;
    const radius = baseRadius + Math.sin(time() * breatheSpeed) * 10;
    overlay.style.background = `radial-gradient(circle ${radius}px at ${cx}px ${cy}px, transparent 0%, transparent 60%, rgba(10,8,14,${darkness}) 100%)`;
  });
}
```

- [ ] **Step 3: Wire it into `src/scenes/tier.js`**

Add the import:

```js
import { setupLantern } from "../systems/lantern.js";
```

Immediately after `const npc = npcSpawn ? spawnNpc(npcSpawn.x, npcSpawn.y) : null;`, add:

```js
    setupLantern(seeker, tierConfig);
```

- [ ] **Step 4: Verify it runs**

Run: `npm run dev`, open via the `run` skill. On the Surface tier (`light: 1.0`), confirm the lantern overlay stays hidden (fully bright). Descend to Folk Arts Gallery (`light: 0.4`) — confirm a dark overlay appears with a gently breathing circular "hole" centered on the Seeker; walk toward the `h` marker on the map and confirm it fades into view as you approach, and the breathing pulse visibly quickens while it's revealing. Confirm pressing `E` on the now-visible hidden marker opens its page correctly (re-uses Task 9's interaction system; the opacity guard there already gates this).

- [ ] **Step 5: Commit**

```bash
git add src/systems/lantern.js src/styles/ui.css src/scenes/tier.js
git commit -m "Add lantern light-reveal system with breathing glow and proximity-based hidden markers"
```

---

### Task 14: Descent transition (stepwell-stair parallax)

**Files:**
- Create: `src/ui/transition.js`
- Modify: `src/styles/ui.css`
- Modify: `src/scenes/tier.js`

**Interfaces:**
- Consumes: GSAP.
- Produces: `playDescentTransition(onMidpoint)` (in `transition.js`) — renders `#transition-root` with three parallaxing step bands, calls `onMidpoint()` once the screen is fully covered (the right moment to call `go("tier", ...)`), then fades the cover back out and clears itself. `tier.js`'s `stairs-down` handler now calls this instead of calling `go` directly.

- [ ] **Step 1: Add transition styles to `src/styles/ui.css`**

```css
#transition-root {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  opacity: 0;
  background: var(--ink);
  overflow: hidden;
  display: none;
}

#transition-root.visible {
  display: block;
}

.transition-steps {
  position: absolute;
  inset: 0;
}

.step {
  position: absolute;
  left: 0;
  right: 0;
  height: 34%;
  background: var(--linework-gold);
  opacity: 0.5;
}

.step-1 { top: 0; }
.step-2 { top: 33%; }
.step-3 { top: 66%; }
```

- [ ] **Step 2: Write `src/ui/transition.js`**

```js
import gsap from "gsap";

export function playDescentTransition(onMidpoint) {
  const root = document.getElementById("transition-root");
  root.innerHTML = `
    <div class="transition-steps">
      <div class="step step-1"></div>
      <div class="step step-2"></div>
      <div class="step step-3"></div>
    </div>
  `;
  root.classList.add("visible");

  const tl = gsap.timeline({
    onComplete: () => {
      root.classList.remove("visible");
      root.innerHTML = "";
    },
  });

  tl.to(root, { opacity: 1, duration: 0.3 })
    .to(root.querySelector(".step-1"), { y: -40, duration: 0.5 }, "<")
    .to(root.querySelector(".step-2"), { y: -60, duration: 0.6 }, "<0.05")
    .to(root.querySelector(".step-3"), { y: -80, duration: 0.7 }, "<0.05")
    .call(() => onMidpoint())
    .to(root, { opacity: 0, duration: 0.3 });
}
```

- [ ] **Step 3: Wire it into `src/scenes/tier.js`, guarding against double-trigger**

Add the import:

```js
import { playDescentTransition } from "../ui/transition.js";
import { playDescentRumble } from "../systems/audio.js";
```

Inside `registerTierScene`'s `scene("tier", (tierId) => { ... })` body, add a local flag right after `state.currentTier = tierId;`:

```js
    let transitioning = false;
```

Replace the `stairs-down` handler from Task 7:

```js
    seeker.onCollide("stairs-down", () => {
      const nextTier = getNextTierId(tierId);
      if (nextTier) go("tier", nextTier);
      else go("ending");
    });
```

with:

```js
    seeker.onCollide("stairs-down", () => {
      if (transitioning) return;
      transitioning = true;
      playDescentRumble();
      playDescentTransition(() => {
        const nextTier = getNextTierId(tierId);
        if (nextTier) go("tier", nextTier);
        else go("ending");
      });
    });
```

- [ ] **Step 4: Verify it runs**

Run: `npm run dev`, open via the `run` skill. Walk into the Surface tier's `>` stairs — confirm the descent rumble plays, three gold step-bands rise and parallax across the screen, the screen briefly fully covers, then the Folk Arts Gallery tier loads (now visibly darker, lantern active per Task 13) as the cover fades out. Confirm walking into stairs repeatedly while the transition plays does not double-trigger or break the scene.

- [ ] **Step 5: Commit**

```bash
git add src/ui/transition.js src/styles/ui.css src/scenes/tier.js
git commit -m "Add stepwell-stair descent transition with parallax and rumble"
```

---

### Task 15: Ending scene — completion bloom, thread-of-light, closing line

**Files:**
- Create: `src/scenes/ending.js`
- Modify: `src/ui/journal.js`
- Modify: `src/styles/ui.css`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `isJourneyComplete`, `getSurfacedCount`, `getTotalFragments` from `fragments.js`; `playCompletionSwell` from `audio.js`; `openJournal` from `journal.js`; `magazine.sutradhar` from `magazine.config.js` (Sutradhar's closing lines — not hardcoded, per Global Constraints); GSAP.
- Produces: `registerEndingScene()` — registers the `"ending"` scene (already targeted by Task 14's stairs-down handler when there is no next tier). `openJournal` gains an options parameter: `openJournal({ animateThread } = {})` — when `animateThread` is true, draws and animates an SVG polyline connecting the centers of all surfaced fragment slots in fragment order. Existing zero-argument calls to `openJournal()` (HUD button, from Task 12) keep working unchanged since the parameter is optional and defaults to `false`.

- [ ] **Step 1: Modify `src/ui/journal.js` to support the animated thread-of-light**

Replace the whole file with:

```js
import { state } from "../state.js";
import { magazine } from "../content/magazine.config.js";
import gsap from "gsap";

export function openJournal({ animateThread = false } = {}) {
  const root = document.getElementById("journal-root");
  const { rows, cols } = magazine.fragments;
  const allFragmentIds = magazine.tiers.flatMap((t) => t.pages.map((p) => p.fragmentId));

  const slots = allFragmentIds
    .map((id) => `<div class="journal-slot ${state.fragmentsSurfaced.has(id) ? "filled" : ""}" data-fragment="${id}"></div>`)
    .join("");

  root.innerHTML = `
    <div class="journal-card folk-border" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">
      <button class="journal-close">×</button>
      ${slots}
      <svg class="journal-thread" viewBox="0 0 1 1" preserveAspectRatio="none"></svg>
    </div>
  `;
  root.classList.add("visible");
  root.querySelector(".journal-close").addEventListener("click", closeJournal);

  if (animateThread) {
    requestAnimationFrame(() => drawThreadOfLight(root, allFragmentIds));
  }
}

function drawThreadOfLight(root, allFragmentIds) {
  const card = root.querySelector(".journal-card");
  const svg = root.querySelector(".journal-thread");
  const cardRect = card.getBoundingClientRect();

  const points = allFragmentIds
    .filter((id) => state.fragmentsSurfaced.has(id))
    .map((id) => {
      const slot = card.querySelector(`[data-fragment="${id}"]`);
      const r = slot.getBoundingClientRect();
      const x = (r.left + r.width / 2 - cardRect.left) / cardRect.width;
      const y = (r.top + r.height / 2 - cardRect.top) / cardRect.height;
      return `${x},${y}`;
    });

  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", points.join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "var(--diya-gold)");
  line.setAttribute("stroke-width", "0.006");
  line.setAttribute("vector-effect", "non-scaling-stroke");
  svg.appendChild(line);

  const length = line.getTotalLength();
  line.style.strokeDasharray = `${length}`;
  line.style.strokeDashoffset = `${length}`;
  gsap.to(line, { strokeDashoffset: 0, duration: 1.2, ease: "power1.inOut" });
}

export function closeJournal() {
  const root = document.getElementById("journal-root");
  root.classList.remove("visible");
  root.innerHTML = "";
}

export function isJournalOpen() {
  return document.getElementById("journal-root").classList.contains("visible");
}
```

- [ ] **Step 2: Add completion-bloom and journal-thread styles to `src/styles/ui.css`**

```css
.journal-thread {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

#completion-bloom {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300px;
  height: 300px;
  margin: -150px 0 0 -150px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--diya-gold) 0%, transparent 70%);
  pointer-events: none;
}
```

- [ ] **Step 3: Write `src/scenes/ending.js`**

```js
import { isJourneyComplete, getSurfacedCount, getTotalFragments } from "../systems/fragments.js";
import { playCompletionSwell } from "../systems/audio.js";
import { openJournal } from "../ui/journal.js";
import { magazine } from "../content/magazine.config.js";
import gsap from "gsap";

export function registerEndingScene() {
  scene("ending", () => {
    add([rect(width(), height()), pos(0, 0), color(20, 18, 30)]);

    if (isJourneyComplete()) {
      playCompletionSwell();
      triggerCompletionBloom();

      add([
        text("The Wellspring", { size: 40 }),
        pos(width() / 2, height() / 2 - 80),
        anchor("center"),
        color(252, 222, 90),
      ]);
      add([
        text(magazine.sutradhar.closingComplete, { size: 18, align: "center" }),
        pos(width() / 2, height() / 2 - 10),
        anchor("center"),
        color(246, 231, 210),
      ]);
      add([
        text("Press Space to view the completed artwork", { size: 14 }),
        pos(width() / 2, height() / 2 + 90),
        anchor("center"),
        color(201, 162, 75),
      ]);
      onKeyPress("space", () => openJournal({ animateThread: true }));
    } else {
      add([
        text("The Wellspring waits.", { size: 32 }),
        pos(width() / 2, height() / 2 - 40),
        anchor("center"),
        color(252, 222, 90),
      ]);
      add([
        text(
          `You have surfaced ${getSurfacedCount()} of ${getTotalFragments()} fragments.\n${magazine.sutradhar.closingIncomplete}`,
          { size: 16, align: "center" }
        ),
        pos(width() / 2, height() / 2 + 10),
        anchor("center"),
        color(246, 231, 210),
      ]);
      add([
        text("Press Space to return and keep seeking", { size: 14 }),
        pos(width() / 2, height() / 2 + 90),
        anchor("center"),
        color(201, 162, 75),
      ]);
      onKeyPress("space", () => go("tier", "folk-arts"));
    }
  });
}

function triggerCompletionBloom() {
  const transitionRoot = document.getElementById("transition-root");
  const burst = document.createElement("div");
  burst.id = "completion-bloom";
  transitionRoot.appendChild(burst);
  transitionRoot.classList.add("visible");

  gsap.fromTo(
    burst,
    { opacity: 0, scale: 0.3 },
    {
      opacity: 1,
      scale: 1,
      duration: 1.2,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(burst, {
          opacity: 0,
          duration: 1,
          delay: 0.4,
          onComplete: () => {
            burst.remove();
            transitionRoot.classList.remove("visible");
          },
        });
      },
    }
  );
}
```

- [ ] **Step 4: Register the scene in `src/main.js`**

```js
import kaplay from "kaplay";
import { registerTitleScene } from "./scenes/title.js";
import { registerTierScene } from "./scenes/tier.js";
import { registerEndingScene } from "./scenes/ending.js";

const k = kaplay({
  width: 960,
  height: 540,
  letterbox: true,
  background: [20, 18, 30],
  global: true,
});

setGravity(0);

registerTitleScene();
registerTierScene();
registerEndingScene();

go("title");

export default k;
```

- [ ] **Step 5: Verify both ending paths**

Run: `npm run dev`, open via the `run` skill.
- **Complete path:** play through, read all 5 pages (both tiers), then walk to the Folk Arts Gallery's stairs-down. Confirm: the completion swell plays, a gold bloom radiates and fades, "The Wellspring" text appears, pressing Space opens the journal with all 5 slots filled and a glowing thread animating to connect them.
- **Incomplete path:** reload the page (fresh state), walk straight to the Folk Arts Gallery's stairs-down without reading any pages. Confirm: "The Wellspring waits." appears with the correct `0 of 5` count, pressing Space returns to the Folk Arts Gallery tier (no fail state, just a nudge back).

- [ ] **Step 6: Commit**

```bash
git add src/scenes/ending.js src/ui/journal.js src/styles/ui.css src/main.js
git commit -m "Add ending scene with completion bloom, thread-of-light journal animation, and incomplete-path fallback"
```

---

### Task 16: Full playthrough verification against acceptance criteria

**Files:** none created or modified unless a bug is found during verification — if so, fix it in the relevant file from the task above that owns it, and note the fix in the commit message.

**Interfaces:** none — this task is integration verification of everything built in Tasks 1–15 together, end to end, matching the spec's §9 acceptance criteria.

- [ ] **Step 1: Run the full automated test suite**

Run: `npx vitest run`
Expected: PASS, all tests from Tasks 2, 3, and 5 (8 tests total).

- [ ] **Step 2: Fresh playthrough — Surface tier**

Run: `npm run dev`, open via the `run` skill, with a hard-reloaded (fresh) page.
Confirm, in order: title screen renders and pulses; Space/click begins the game; Surface tier loads with no console errors; Seeker moves with WASD and arrows; Seeker collides with walls and cannot leave the map; the Custodian idle-bobs and faces the Seeker on approach; pressing `E` near the Custodian opens dialogue with the configured lines and cycles through them; `Esc` closes dialogue; the lit page marker (`p01`) is visible without needing the lantern (Surface is full daylight).

- [ ] **Step 3: Surface tier — reading and fragments**

Open `p01` via `E`. Confirm: archival reader card with correct title/caption, zoom via scroll wheel works, close button and `Esc` both close it. Confirm on first open: chime plays, a glowing dot flies from the reader to the journal HUD button, counter updates to `Surfaced: 1 / 5` with a bounce-pulse. Re-open `p01` again — confirm no duplicate chime/flight/count increase.

- [ ] **Step 4: Descend and verify the Folk Arts Gallery tier**

Walk to the `>` stairs. Confirm the descent transition (parallax steps + rumble) plays, then the Folk Arts Gallery loads visibly darker with the lantern overlay active and breathing around the Seeker. Confirm the open markers (`p02`, `p03`, `p05`) are visible without the lantern; the hidden marker (`p04`) is invisible until the Seeker's lantern radius reaches it, at which point it fades in and the breathing pulse visibly quickens just before. Read all four remaining pages, confirming `p02` and `p04` show the corner-peel "lift to reveal" affordance and `p03`/`p05` do not. Confirm the HUD counter reaches `Surfaced: 5 / 5`.

- [ ] **Step 5: Verify completion**

Walk to the Folk Arts Gallery's `>` stairs with all 5 fragments surfaced. Confirm the ending scene's complete path triggers exactly as described in Task 15 Step 5, and the journal's thread-of-light connects all 5 slots.

- [ ] **Step 6: Verify the no-fail incomplete path**

Hard-reload the page (fresh state). Go straight to the Folk Arts Gallery's `>` stairs without reading any page. Confirm the incomplete-path ending message and the "return and keep seeking" flow back to `folk-arts` works, and that nothing in the game ever presents a loss/fail state.

- [ ] **Step 7: Verify audio and mute**

From a fresh reload, confirm no sound plays before the first click/keypress on the title screen. Click the HUD mute button mid-playthrough; confirm no further SFX play (footstep clicks are not wired to movement in this slice — footstep sound exists as a function but is intentionally not yet triggered automatically; confirm `playPageOpen`, `playFragmentChime`, `playDescentRumble`, `playCompletionSwell` all respect the mute flag by toggling mute and re-triggering each via their normal game actions).

- [ ] **Step 8: Fix any issues found, then final commit**

If any check above failed, fix it in the owning file from the relevant earlier task, re-run the specific verification step until it passes, then commit:

```bash
git add -A
git commit -m "Fix issues found during full vertical-slice playthrough verification"
```

If nothing failed, no commit is needed for this task — the slice is done.

---

