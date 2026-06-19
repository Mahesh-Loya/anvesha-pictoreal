# Anvesha — *The Stepwell of Anvesha*
### Product Requirements Document · v2.0 · Build Reference

> An interactive companion to the magazine *Anvesha* (Volume 28). The reader becomes a **Seeker** who descends a stepwell, tier by tier, uncovering folk arts, forgotten knowledge, and finally their own inner search — collecting fragments that assemble into one hidden artwork. The game mechanic *is* the magazine's theme: *anvesha*, the act of seeking what lies beneath the surface.

---

## 0. How to use this document

This is the single source of truth for building the game in VS Code. The flow:

1. Read sections 1–8 to understand *what* you're building and *why*.
2. Use sections 9–12 to set up the project and start coding.
3. All magazine content lives in **one file** — `src/content/magazine.config.js` (section 10). Editors and writers only ever touch that file; they never need to read game code.
4. Build in the phase order of section 13.

---

## 1. Vision & Design Pillars

**Vision.** Turn *Anvesha* from a magazine you scroll into a world you *seek through*. The deeper you go, the more hidden and precious the stories — exactly mirroring the volume's thesis that real value lies beneath the surface, in the overlooked and the unrecorded.

**Design pillars** (every feature decision answers to these):

1. **Seeking over showing.** The visible is easy; the worthwhile is hidden. Reward curiosity, never punish it.
2. **Descent equals depth.** Going down the stepwell is the literal experience of looking beneath the surface. Level design carries the meaning.
3. **The reader and the player do the same thing.** Uncovering a page in the game = uncovering a story in the magazine. One act, one soul.
4. **The game wears the magazine's skin.** Same palette, motifs, and folk-art language. Print and game read as one volume.
5. **No fail states.** No timer, no enemies, no losing. The only progression is discovery.

---

## 2. Theme → Mechanic Mapping

This is how the editorial brief becomes a game. Every row is traceable to the *Anvesha* theme document.

| Editorial idea (from the brief) | Becomes this game feature |
|---|---|
| "Uncover the depth beneath the surface" | The stepwell **descent**: each lower tier is more hidden |
| "Sutradhar — a seeker/guide collecting clues across pages" | The **player is the Seeker**; the Sutradhar narrates |
| "The Custodian of Forgotten Books" | The **guide NPC** who sets the quest and reacts to discoveries |
| "Clues across pages assemble one artwork (jigsaw / treasure hunt)" | **Fragments → Journal → assembled artwork** = the win condition |
| "Pages that reveal content in layers — folds, flaps" | The **page reader's layered reveal** (tap to lift the surface) |
| "Content shown like museum exhibits with captions, archival framing" | The reader's **archival/exhibit framing** |
| "Forgotten arts with QR-linked extended archives" | Optional **archive links** on pages |
| "Transition pages from visible to invisible" | The **descent transition** between tiers |
| "Curiosity that reveals silence, depth, subtle brilliance" | The **lantern/light-reveal**: hidden fragments glow only when the lamp is near |
| "The student's internal journey — hidden talents, quiet strengths" | The **deepest tier**: the most personal, most hidden content |
| Colour palette + folk motifs + stepwell geometry | The **art direction** (section 7) |

---

## 3. The World: The Stepwell of Anvesha

A single stepwell (baoli). The Seeker enters at the **surface** and descends through tiers. Each tier is a magazine section. The deeper the tier, the dimmer the light, the more hidden the content, and the more precious the fragment it yields. The bottom holds the assembled artwork — the payoff.

**Tier layout (default — final tiers come from the real table of contents):**

| Depth | Tier | Section | Content examples | Mood / light |
|---|---|---|---|---|
| 0 | The Surface | Introduction / Editor's note | Welcome, the visible city collage, the Sutradhar's intro | Bright, daylight |
| 1 | Folk Arts Gallery | Folk & tribal arts | Warli, Madhubani/Mithila, Bengal Patua, Chittara, Tholu Bommalata | Warm saffron |
| 2 | Hall of Dying Dialects | Language & oral tradition | Dying dialects, folk tales, oral narratives | Terracotta dusk |
| 3 | The Forgotten Library | Knowledge & history | Custodian of Forgotten Books, miscredited discoveries, suppressed identities | Deep maroon, lamplit |
| 4 | Hidden Architecture | Architecture & craft | Stepwells, hidden marvels beyond the famous, regional crafts | Indigo, cool |
| 5 | The Inner Depths | The student's inner journey | Hidden talents, personal battles, silent support, journal-entry pages | Darkest, intimate, gold accents |
| — | The Wellspring | (the bottom) | The fragments assemble into one folk artwork | Glowing reveal |

Each tier is its own scene/map. Tiers are connected by **stairs down** (and back up). The tier list, its content, and its map are all defined in the config — adding or removing a tier never touches engine code.

---

## 4. Characters

**The Seeker (player) — the *Anveshak*.**
A young explorer with a satchel and a small lamp (diya). 4-direction walk cycle. Carries the lantern that reveals hidden things in dark tiers.

**The Sutradhar (narrating voice).**
The threading narrator from the magazine. Speaks at key moments — entering a tier, surfacing a fragment, completing the quest. Evocative, slightly poetic register. Implemented as on-screen narration text (and optional voice later), not a walking character.

**The Custodian of Forgotten Books (guide NPC).**
Straight from the content brief. Met at the surface; sets the quest ("the magazine's true stories are hidden below — seek them"). Reappears or comments as tiers are completed. Optional per-tier keeper NPCs can give a line of flavor for their section. All NPC dialogue is data-driven.

---

## 5. Core Gameplay Loop

1. **Title screen** → "Begin the Anvesha."
2. **Surface spawn** — meet the Custodian, who frames the quest and the journal.
3. **Explore the tier** — walk with arrow keys/WASD (desktop) or on-screen joystick (mobile).
4. **Discover** — find a page marker (lit ones in the open; hidden ones revealed by bringing the lantern near).
5. **Read** — the page reader opens: view the surface image, *lift* it to reveal the hidden layer, read the caption, optionally open the archive link.
6. **Surface a fragment** — first read of a page yields a fragment; the journal updates; a chime plays; the HUD counter ticks up.
7. **Descend** — take the stairs to the next, deeper, dimmer tier.
8. **Complete** — when all fragments are surfaced, the journal assembles the full artwork; the Sutradhar closes the journey.

No losing, no timer. The loop is explore → uncover → read → descend.

---

## 6. Mechanics (detailed)

### 6.1 Movement & controls
- **Desktop:** arrow keys / WASD to move; `E` or `Space` to interact; `Esc` to close overlays.
- **Mobile:** on-screen joystick (bottom-left), action button (bottom-right). Auto-detected on touch devices.
- Camera follows the Seeker; tiers are small enough to stay intimate.

### 6.2 Descent / tier transitions
- Stairs (`>` in the tilemap) trigger a short transition: a fade with a Sutradhar line, the screen darkening one notch (visible → invisible). Loads the next tier scene.
- Stairs up (`<`) allow returning to re-read earlier tiers.

### 6.3 The lantern / light-reveal
- Each tier has an ambient light level (config `light`, 0–1), decreasing with depth.
- The Seeker emits a soft light radius. In dark tiers, **hidden page markers are invisible until inside the lamp radius**, then they glow.
- Implementation: a dark overlay over the scene with a "hole" (radial mask) following the Seeker. Hidden markers fade in by proximity. Keep it cheap (one overlay, opacity by distance) for mobile performance.

### 6.4 Fragments → Journal → assembled artwork (win condition)
- The final artwork (a folk composition — e.g. Madhubani) is sliced into N fragments (config `fragments.rows × cols`).
- Each page has a `fragmentId`. First read surfaces that fragment into the **Journal**.
- The Journal screen shows the artwork assembling, empty slots filling in as you progress.
- Surfacing the last fragment completes the image and triggers the ending.
- Total fragment count = total page count, derived automatically from the config.

### 6.5 The Page Reader with layered reveal
HTML/CSS overlay (not the game canvas):
- Opens over a dimmed game, shows the page `surfaceImage` fit-to-screen.
- **Lift to reveal:** if a `hiddenImage` exists, a "lift the surface" affordance (tap / drag / button) cross-fades or peels to the hidden layer — the fold/flap idea.
- Zoom (pinch on mobile, buttons/scroll on desktop) and pan when zoomed.
- Caption plate + section label (archival framing).
- Optional **archive link** (the QR idea) opens an external page.
- Next/previous within the tier; close returns to the exact map position.
- Images lazy-load so the game starts fast.

### 6.6 Museum / archival framing
- The reader is styled as an exhibit card: archival-ivory mat, a caption plate, a thin folk-art border. Makes every page feel like a uncovered artifact.

### 6.7 Discovery counter / HUD
- Persistent, minimal: `Surfaced: X / N`. Thematic wording ("surfaced/uncovered", not "found/collected").
- A small mute toggle. A small journal button to open the assembling artwork.

### 6.8 Completion / ending
- The artwork completes in the journal.
- The Sutradhar delivers a closing line about what was uncovered.
- A gentle celebration (the artwork glows; soft confetti or diya-light bloom). Option to keep wandering and re-read.

---

## 7. Art Direction

**Drop the generic retro-pixel idea.** The game adopts the magazine's own visual language, so print and game are one design system and the game can reuse the design team's assets.

**Palette (from the brief):**

| Use | Colour | Hex (starting point) |
|---|---|---|
| Surface / light tier | Mustard gold | `#E8C77A` |
| Folk arts tier | Saffron orange | `#D97A2B` |
| Dialects tier | Terracotta red | `#B5482E` |
| Library tier | Deep maroon | `#7A2230` |
| Architecture tier | Indigo blue | `#34406B` |
| Inner depths tier | Charcoal / deep teal | `#243A33` |
| Linework / accents | Antique gold | `#C9A24B` |
| Highlights / lamp | Bright diya gold | `#FCDE5A` |
| Paper / mats | Archival ivory | `#F6E7D2` |

Plus the brief's full set: crafted teals, emerald greens, rust browns — for props and motif variety.

**Visual language.**
- Folk-art and textile-inspired **borders** framing the screen and the reader.
- **Gold linework on jewel-tone backgrounds** for architecture (per the Chamba / Bidri / Blue-Pottery references).
- Textures from manuscripts, terracotta, and stone carvings as subtle surfaces.
- **Stepwell geometry** as the structural motif throughout (steps, descent, symmetry).
- The Seeker and NPCs drawn in a clean folk-illustration style (Warli-esque silhouettes work well at small sizes).

**Per-tier theming.** Each tier reskins the shared tileset with its palette row above, so the player *feels* the descent through colour as much as depth.

**Asset approach for v1.** Use the magazine's existing motifs/borders where possible; free CC0 base tiles (Kenney.nl, itch.io) can stand in for the floor/props early, reskinned to the palette later. Keep everything on a consistent 32px grid.

---

## 8. Audio

- **Ambient:** a soft folk/raga loop; water-and-stone tones deepen as you descend.
- **SFX:** footstep tick, page-open whoosh, **fragment chime** (signature sound of a discovery), tier-descent rumble, journal-complete bloom.
- **Mute toggle** in the HUD.
- **Autoplay-safe:** audio starts on first user interaction (tap/key), per browser rules.

---

## 9. Technical Architecture

**Stack**
- **Kaplay `3001` (stable line)** — the exploration layer: scenes (one per tier), sprites, movement, collision, interaction, ASCII-map levels. Pure JS/TS, browser-native. (v4000 exists but its API can still change; pin to 3001 for the build.)
- **Vanilla HTML/CSS** — the page reader, journal, HUD, title screen, dialogue box.
- **Vite** — dev server with hot reload + production build. Dev URL `http://localhost:5173`.
- **Node.js 22+** — required by the Kaplay scaffold tooling.
- **GitHub Pages** — free static hosting, link-shareable. (Set `base` in `vite.config.js` to the repo name.)
- **No backend.** Fully static.

**Why the split.** Kaplay handles motion and the world; the DOM handles reading and UI text. Zooming high-resolution magazine scans is something the browser already does beautifully — keeping the reader in HTML keeps pages pixel-sharp at any zoom and keeps the engine light.

**Scene model.** One Kaplay scene per tier, plus `title` and `ending`. Stairs call `go(nextTierScene)`. A small global state object holds: fragments surfaced, current tier, audio on/off.

**Levels via ASCII maps.** Each tier's layout is an array of strings in the config, fed to Kaplay's `addLevel()`. A legend maps characters to tiles (see section 10), so designers can sketch a tier in a text editor.

**State persistence (optional).** Keep state in memory for v1. Optionally persist `fragmentsSurfaced` and `audioMuted` to `localStorage` in your own deployment so a returning reader keeps progress. (Note: `localStorage` works in real hosting; just don't rely on it inside any sandboxed preview.)

---

## 10. Content Configuration (the one file editors touch)

`src/content/magazine.config.js`

**Tilemap legend:** `#` = wall/prop, `.` = floor, `S` = Seeker spawn, `C` = Custodian/NPC, `p` = open page marker, `h` = hidden page marker (needs lamp), `>` = stairs down, `<` = stairs up.

```js
export const magazine = {
  title: "Anvesha — Volume 28",

  // The artwork that fragments assemble into (the win condition)
  fragments: {
    image: "/art/final-madhubani.jpg",
    rows: 4,
    cols: 5,            // 20 fragments → game expects 20 readable pages
  },

  tiers: [
    {
      id: "surface",
      name: "The Surface",
      section: "Introduction",
      depth: 0,
      light: 1.0,                         // 1 = full daylight; lower = darker
      palette: { wall: "#E8C77A", bg: "#2A3A5E" },
      map: [
        "########################",
        "#......................#",
        "#......S.......C........#",
        "#..........p...........#",
        "#.....................>#",
        "########################",
      ],
      npc: {
        id: "custodian",
        sprite: "custodian",
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
          surfaceImage: "/pages/p01-surface.jpg",
          hiddenImage: "/pages/p01-hidden.jpg", // optional layered reveal
          caption: "From the editorial desk",
          archiveUrl: null,                      // optional QR / extended archive
          fragmentId: "f01",
        },
      ],
    },

    {
      id: "folk-arts",
      name: "Folk Arts Gallery",
      section: "Folk & Tribal Arts",
      depth: 1,
      light: 0.8,
      palette: { wall: "#D97A2B", bg: "#241A2E" },
      map: [
        "########################",
        "#<....p.......p........#",
        "#......................#",
        "#...C.......h..........#",
        "#.....................>#",
        "########################",
      ],
      npc: { id: "patua", sprite: "patua", lines: ["These scrolls once told whole epics..."] },
      pages: [
        { id: "p02", title: "Warli: The Geometry of Daily Life", surfaceImage: "/pages/p02-surface.jpg", hiddenImage: "/pages/p02-hidden.jpg", caption: "Maharashtra", archiveUrl: null, fragmentId: "f02" },
        { id: "p03", title: "Mithila Tales: Madhubani Today",     surfaceImage: "/pages/p03-surface.jpg", hiddenImage: null,                    caption: "Bihar",       archiveUrl: null, fragmentId: "f03" },
        { id: "p04", title: "Bengal Patua Scrolls",               surfaceImage: "/pages/p04-surface.jpg", hiddenImage: "/pages/p04-hidden.jpg", caption: "West Bengal", archiveUrl: null, fragmentId: "f04" },
      ],
    },

    // ...repeat for: dying-dialects, forgotten-library, hidden-architecture, inner-depths
  ],
};
```

Derived automatically: total pages, total fragments, per-tier counts. Validation on load should warn if `fragments.rows × cols` ≠ total pages.

---

## 11. Project Structure

```
anvesha-game/
├─ index.html
├─ package.json
├─ vite.config.js              # set base: '/<repo-name>/' for GitHub Pages
├─ public/
│  ├─ pages/                   # page images: p01-surface.jpg, p01-hidden.jpg ...
│  ├─ art/                     # final-madhubani.jpg (the assembled artwork)
│  ├─ sprites/                 # seeker, npcs, tiles, props
│  └─ audio/                   # ambient.mp3, sfx/*.mp3
├─ src/
│  ├─ main.js                  # boot Kaplay, load assets, start title scene
│  ├─ content/
│  │  └─ magazine.config.js    # ← the only file editors touch
│  ├─ state.js                 # global game state (fragments, tier, audio)
│  ├─ scenes/
│  │  ├─ title.js
│  │  ├─ tier.js               # generic tier scene, built from config
│  │  └─ ending.js
│  ├─ entities/
│  │  ├─ seeker.js             # player + lamp light
│  │  └─ npc.js
│  ├─ systems/
│  │  ├─ level.js              # ASCII map → Kaplay addLevel
│  │  ├─ interaction.js        # proximity + interact
│  │  ├─ lantern.js            # dark overlay + reveal
│  │  ├─ fragments.js          # surfacing + journal state
│  │  └─ audio.js
│  ├─ ui/
│  │  ├─ reader.js             # HTML page reader + layered reveal
│  │  ├─ journal.js            # assembling-artwork screen
│  │  ├─ dialogue.js           # Sutradhar / NPC text box
│  │  ├─ hud.js                # counter + mute + journal button
│  │  └─ touch-controls.js     # mobile joystick + action button
│  └─ styles/
│     └─ ui.css                # archival framing, folk borders, palette vars
```

---

## 12. Quick Start (in VS Code)

**Fastest path (scaffolds Vite + Kaplay):**
```bash
# Requires Node.js 22+
npx create-kaplay anvesha-game
cd anvesha-game
npm run dev          # opens http://localhost:5173
```

**Manual path (more control):**
```bash
npm create vite@latest anvesha-game -- --template vanilla
cd anvesha-game
npm install kaplay@3001
npm run dev
```

**Import in main.js:**
```js
import kaplay from "kaplay";
const k = kaplay({ background: [22, 31, 58] }); // indigo backdrop
```

**Deploy to GitHub Pages:**
```js
// vite.config.js
export default { base: "/anvesha-game/" };  // match your repo name
```
```bash
npm run build        # outputs /dist
# push /dist via the gh-pages package or a GitHub Pages Action
```

---

## 13. Build Phases / Milestones

**Phase 0 — Setup (½ day).** Project runs; blank Kaplay scene + title screen.

**Phase 1 — Movement (1 day).** Seeker walks on a test tilemap with collision; camera follows; desktop controls.

**Phase 2 — Tiers from config (1–2 days).** Generic `tier` scene builds any tier from the config's ASCII map + palette; stairs move between tiers.

**Phase 3 — Interaction + Reader (2 days).** Page markers; HTML reader opens config pages with zoom/pan/next/prev/close; layered "lift to reveal."

**Phase 4 — Fragments + Journal (1–2 days).** First-read surfaces a fragment; journal screen assembles the artwork; completion triggers ending.

**Phase 5 — Lantern + dark tiers (1 day).** Light overlay; hidden markers revealed by proximity in deep tiers.

**Phase 6 — NPCs + Sutradhar (1 day).** Custodian + per-tier guides; dialogue box; narration at transitions.

**Phase 7 — Audio (½ day).** Ambient loop, SFX, mute, autoplay-safe start.

**Phase 8 — Mobile (1 day).** Joystick + action button; pinch-zoom in reader; touch detection.

**Phase 9 — Art pass + polish + deploy (1–2 days).** Folk borders, palette per tier, transitions, performance, GitHub Pages.

**Rough total:** ~11–14 focused days for one developer; phases split cleanly across a small team.

---

## 14. Acceptance Criteria (v1 done)

- [ ] Loads in under ~3s on a mid-range phone.
- [ ] Seeker moves on desktop (WASD/arrows) and mobile (joystick).
- [ ] Every page in the config is reachable and readable.
- [ ] Reader supports zoom, pan, next/prev, close-returns-to-position, and layered reveal where a hidden image exists.
- [ ] Descending dims the world; hidden markers in deep tiers reveal only within the lamp radius.
- [ ] First read of each page surfaces exactly one fragment; the journal reflects it.
- [ ] Surfacing the final fragment completes the artwork and shows the ending.
- [ ] Custodian appears at the surface; each tier has at least one NPC line.
- [ ] Counter wording is thematic ("Surfaced: X / N").
- [ ] Audio mutes correctly and never autoplays before a tap.
- [ ] Adding a page or tier requires editing only `magazine.config.js`.
- [ ] No console errors; works in current Chrome, Safari, Firefox.

---

## 15. Assets Checklist (to provide)

- [ ] All magazine pages as web-optimized images (`~1500px` wide, compressed).
- [ ] For layered pages: a `surfaceImage` and a `hiddenImage`.
- [ ] The final artwork image (Madhubani/Warli composition) for the fragment puzzle.
- [ ] Final table of contents → tier list (section + which pages belong where).
- [ ] Sprites: Seeker (4-direction walk), Custodian, per-tier NPCs, base tiles + props per palette.
- [ ] NPC + Sutradhar dialogue lines per tier.
- [ ] Title art (or text-based for v1).
- [ ] One ambient track + SFX (or chosen from free libraries).

---

## 16. Stretch Goals (v2+)

- Persist progress across visits (`localStorage`).
- Voiced Sutradhar narration.
- A "thread of light" that connects fragments you've found on the journal.
- Per-tier completion rewards (a revived folk motif animates).
- Day/night or seasonal ambience.
- Light analytics on which pages get read most.
- An accessibility mode (high-contrast, larger text, reduced motion).

---

## 17. Open Decisions to Confirm Before Coding

1. **Final tiers & page count** — lock the table of contents so `fragments.rows × cols` matches total pages.
2. **Layered pages** — which pages get a `hiddenImage` (the fold/flap reveal), and which are single-layer?
3. **The final artwork** — which folk style and image becomes the assembled puzzle?
4. **Art ownership** — reuse the magazine design team's motifs/sprites, or free CC0 base art for v1?
5. **Deployment** — GitHub Pages under the college/club org, or elsewhere?
6. **Title** — *Anvesha: The Stepwell of Anvesha*, or a shorter in-game title?
