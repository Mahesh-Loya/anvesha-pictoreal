# Anvesha — Roadmap

The game is complete and live. This is the considered plan for making it
better as a **year-round experience** (not one-off event dressing), roughly in
order of value. Items move up when their blockers clear.

## Now / next (high value, no blockers)

1. **Find yourself (search).** A search box in the Index matching names,
   article titles and section names (the narration blurbs already contain
   authors' names — the data exists). Everyone's first instinct is to find
   their own page; this serves it in seconds.
2. **Share this page (deep links).** `?page=<id>` opens the game straight onto
   a specific page + a "Share" button in the reader that copies that link.
   Students share their own piece; the link previews nicely (OG card exists).
3. **Completion payoff.** Section-completion moments from the Sutradhar
   ("you have walked all of the Marathi hall…") and a real finale at 154/154
   (diya fireworks around the emblem, a closing blessing). The emblem already
   brightens with progress — this finishes that arc.
4. **First-run guidance.** A gentle sparkle-trail / Sutradhar hint toward the
   nearest unread page so a first-time visitor is never lost.

## Blocked on content (waiting on the magazine team)

5. **Full text of articles & poems in the reader + full read-aloud.**
   Blocker: the ORIGINAL submission text (Word/Google docs) from the club —
   scans can't be read reliably. Agreed approach once text arrives:
   - full text shown in the reader (read along while zooming the scan)
   - poems & short pieces: full ElevenLabs (Sanjay) narration — cheap
   - long articles: browser TTS by default (free, unlimited); upgrade to
     Sanjay clips only if the ElevenLabs plan allows (~180k chars needed)

## Nice-to-have (whenever)

6. **Hidden easter egg** — a secret alcove / special Sutradhar line. Cheap
   delight, makes word-of-mouth ("did you find it?").
7. **Photo mode** — hide UI, free camera, download a framed screenshot.
8. **Ambience deepening** — distant water drips, torch crackle, footstep dust.
9. **Favourites (⭐)** on Collection tiles (local, next to emoji reactions).
10. **Real rigged walk cycle** (Mixamo auto-rig) — parked: manual, finicky,
    low visible payoff at game distance.

## Decided against (and why)

- **Backend for shared reaction counts / guestbook** — a static site has
  nothing that can break or expire; free-tier backends sleep and die quietly.
  Fragility isn't worth the virality for a year-round artifact.
- **OCR for page text** — magazine layouts defeat OCR (columns, Devanagari,
  stylized type). Originals from the team are the right source.
- **Splash-screen music** — browsers block audio before the first tap;
  music correctly starts on begin.

## Standing operational notes

- Deploys are automatic: push to `master` → tests → build → live in ~2 min.
- Showcase mode lives at `?showcase` (documented in README) — zero impact on
  normal players.
- Voice regeneration: `npm run voice:generate` with `ELEVENLABS_API_KEY` +
  `ELEVENLABS_VOICE_ID=PboFIQ6kckfADmG3UQYF` (Sanjay). Key stays local.
- The ElevenLabs key used during development appeared in chat and should be
  rotated at elevenlabs.io (the shipped MP3s don't need it).
