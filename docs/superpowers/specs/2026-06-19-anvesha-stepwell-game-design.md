# Anvesha — The Stepwell of Anvesha (v1 Vertical Slice)
### Design Spec · 2026-06-19

Source brief: `anvesha-stepwell-prd-v2.md` (full PRD, all 6 tiers, long-term vision). This spec scopes and extends that PRD into a buildable v1 slice, with an explicit design/animation layer added on top per stakeholder request ("proper, creative, impressive — not a boring scroll").

---

## 1. Vision (carried from the PRD)

The reader becomes a **Seeker** descending a stepwell, tier by tier. Each tier is a magazine section; going deeper = uncovering more hidden, more precious content. Fragments collected from reading pages assemble into one folk-art image — the win condition. No fail states; the only progression is discovery. See PRD §1–§2 for the full theme-to-mechanic mapping; it is not repeated here and remains authoritative for tone and intent.

## 2. Scope of this slice

Build a complete, polished, playable loop across **two tiers**, not all six:

- **The Surface** (tier 0): Custodian NPC, 1 readable page.
- **Folk Arts Gallery** (tier 1): 1 NPC, 4 readable pages (mix of lit and lantern-hidden markers).
- **The Wellspring** (ending): journal completes, Sutradhar closing line, completion bloom.

Total: 5 pages → 5 fragments → a 1×5 fragment grid (one fragment per page, exact match, no remainder to design around).

**Why a slice, not all six tiers:** the engine is entirely config-driven (PRD §10) — once movement, the lantern, the reader, fragments/journal, and transitions are right for two tiers, cloning to the remaining four (Dying Dialects, Forgotten Library, Hidden Architecture, Inner Depths) is config + content work, not new engineering. Validating "does this feel good" early avoids polishing six tiers' worth of a mechanic that needs to change.

**Explicitly deferred** (not built in this slice, but the architecture must not block them later):
- Remaining 4 tiers (content/config only, once slice is approved).
- Mobile touch controls (PRD §6.1, Phase 8) — CSS/layout stays responsive-ready, but on-screen joystick is not implemented yet.
- Real magazine assets — placeholder content only (see §6).
- GitHub Pages deployment — local dev only for now.
- `localStorage` persistence — in-memory state only.

## 3. Architecture

Unchanged from PRD §9:
- **Kaplay 3001** — scenes (one per tier + title + ending), movement, collision, ASCII-map levels.
- **Vanilla HTML/CSS + GSAP** — page reader, journal, HUD, dialogue box, title screen. GSAP (free core) handles all multi-step DOM choreography (page peel, fragment flight, journal assembly, completion bloom); Kaplay's native `tween()` handles in-canvas motion (Seeker, lamp, NPC idle).
- **Vite** dev server, no backend, static output.
- **Scene model**: generic `tier.js` scene parameterized entirely by `magazine.config.js`; a small global `state.js` (fragments surfaced, current tier, audio muted).

Project structure follows PRD §11 as-is.

## 4. Design system

Design is a first-class deliverable here, not an afterthought layered onto functional UI.

- **Design tokens**: every palette color from PRD §7 becomes a CSS custom property (`--tier-surface`, `--tier-folk-arts`, `--diya-gold`, `--archival-ivory`, etc.) defined once in `src/styles/ui.css`. No component hardcodes a hex value.
- **Typography**: a serif display face for titles and Sutradhar narration (archival/manuscript register) and a clean sans for captions and UI chrome. Starts on a system-font stack (Georgia/Garamond-like serif + system sans) — zero network dependency for the slice; swapping to a webfont later is a one-line CSS change.
- **One reusable motif**: a folk-art border (repeating SVG pattern as a CSS `border-image`) is the single visual signature reused identically across the reader card, journal panel, dialogue box, and HUD panel — so all UI reads as one designed system, not four separately-styled components.
- **Reader card**: archival-ivory mat, caption plate, thin gold border (PRD §6.6).

## 5. Gameplay loop & mechanics (slice-specific detail)

Loop is PRD §5 unchanged. Mechanic implementation notes for this slice:

- **Movement**: WASD/arrows, `E`/Space to interact, `Esc` closes overlays (PRD §6.1). Mobile input not wired up yet.
- **Lantern / light-reveal**: a DOM overlay with a CSS radial-gradient mask tracks the Seeker's screen position (chosen over a Kaplay shader or per-tile opacity — see rationale below). The glow gently pulses ("breathing"); pulse quickens when a hidden marker is within radius, as anticipatory feedback before the marker fades in.
  - *Rationale for DOM overlay over shader*: identical behavior across every browser/GPU, trivially animatable with CSS, and fully decoupled from Kaplay's render loop so it can't regress canvas performance.
- **Descent transition**: stylized stepwell-stair silhouettes parallax past the camera while the palette shifts tier-to-tier, replacing a flat fade (PRD §6.2's "darkening one notch" becomes a literal visual descent).
- **Page reader**: opens over a dimmed game (PRD §6.5). "Lift to reveal" is implemented as a **corner-peel**: drag from a corner on touch, animated peel on click on desktop, revealing the hidden layer underneath — chosen over a crossfade because it makes "uncovering" tactile rather than just visual.
- **Fragments → Journal**: on first read, a small glowing fragment icon animates (GSAP) from the reader, arcing into its empty journal slot, synced with the fragment chime — replacing a flat counter-tick with a spatial payoff.
- **HUD**: `Surfaced: X / N` counter does a bounce-pulse on increment; mute toggle; journal button (PRD §6.7).
- **NPCs**: idle-bob animation; turn to face the Seeker when within interaction range.
- **Ending**: journal completes with a diya-light particle bloom; a thread-of-light animates connecting each fragment as it locks into the grid (pulled forward from PRD §16 stretch goals — cheap with GSAP, high perceived payoff); Sutradhar delivers the closing line.

## 6. Placeholder content strategy

No real magazine assets exist yet. A local generation script produces actual files (not external fetches, not guessed URLs):

- Palette-tinted SVG "pages" using simple Warli/Madhubani-style motifs (dot grids, triangle rows, stick figures) for each page's `surfaceImage` and, where flagged in config, a `hiddenImage`.
- A placeholder final artwork image (geometric folk-pattern composition) sliced into fragments matching the page count.

These are real files under `/public`, generated once and committed, so `magazine.config.js` works exactly as it will with real content. Swapping in actual magazine scans later is a file replace — no code or config shape changes.

## 7. Audio

All SFX (footstep tick, page-open whoosh, fragment chime, descent rumble, completion swell) are synthesized at runtime via Web Audio API oscillators — no audio files to source or link. Mute toggle in HUD; autoplay-safe (starts only after first user interaction, per browser policy). Swappable later: dropping real files into `/public/audio` and pointing the audio system at them replaces the synthesized versions without other changes.

## 8. Verification approach

This is a game — correctness is necessary but not sufficient; feel must be checked visually. After each build phase, use the `run` skill to launch the dev server and play the actual loop: confirm the lantern reveal radius and pulse look right, the corner-peel feels natural, fragment flight lands correctly on the journal slot, the descent transition reads as "going down," and the completion bloom triggers correctly on the last fragment. Pure logic (fragment-count validation against `rows × cols`, journal state transitions) can get quick unit tests where a test runner is trivial to add, but game feel is verified by playing it, not by assertions.

## 9. Acceptance criteria (slice-scoped subset of PRD §14)

- [ ] Loads fast locally; no console errors in Chrome/Firefox.
- [ ] Seeker moves on desktop with collision against tier walls.
- [ ] All 5 pages across both tiers are reachable and readable, including lantern-hidden markers in the Folk Arts Gallery.
- [ ] Reader supports zoom/pan/next/prev/close-returns-to-position, and the corner-peel reveal works for pages with a `hiddenImage`.
- [ ] Lantern radius reveals hidden markers only within proximity; glow pulses and quickens near a hidden marker.
- [ ] First read of each page surfaces exactly one fragment with the fly-to-journal animation and chime.
- [ ] Surfacing the final fragment triggers the completion bloom and Sutradhar's closing line.
- [ ] Custodian and the Folk Arts NPC each deliver their configured lines.
- [ ] Counter reads "Surfaced: X / N"; mute toggle works; audio never plays before a tap/keypress.
- [ ] Descending from Surface to Folk Arts Gallery plays the stepwell-stair transition, not a flat fade.
- [ ] All content (pages, NPC lines, fragment count) comes from `magazine.config.js` — no hardcoded content in engine/UI code.

## 10. Resolved vs. still-open decisions (PRD §17)

Resolved for this slice:
1. Tiers/page count — locked to 2 tiers, 5 pages (above), expansion to remaining 4 tiers deferred to a follow-up pass once this slice is approved.
2. Layered pages — at least 2 of the 4 Folk Arts pages get a `hiddenImage` (to exercise the peel mechanic); rest single-layer.
3. Final artwork — placeholder geometric folk-pattern image for now; real artwork swapped in later.
4. Art ownership — placeholder-generated for v1, magazine team assets swapped in later (per PRD §17.4, deferred to real-content pass).

Still open, not blocking this slice:
5. Deployment target (GitHub Pages vs. elsewhere) — revisit once content is real.
6. Final title wording — using "Anvesha — The Stepwell of Anvesha" as-is; can shorten later with no structural impact.
