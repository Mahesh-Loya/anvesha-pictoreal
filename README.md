# Anvesha — Pictoreal Vol. 28, The Descent

An explorable 3D companion to **PICTOREAL Volume 28** (theme: *Anvesha*, the seeking).
Descend a lamp-lit stepwell shaped like the Pictoreal mandala-eye, guided by the
Sutradhar, and uncover all 154 pages of the magazine hidden in its niches.

**Play it:** https://mahesh-loya.github.io/anvesha-pictoreal/

**Cinematic showcase** (for events/projectors — a looping auto-flight with
captions and a QR finale; any key hands control to a live player):
https://mahesh-loya.github.io/anvesha-pictoreal/?showcase

**QR code** to the game (printable): `public/qr.png` — also served at
https://mahesh-loya.github.io/anvesha-pictoreal/qr.png

- `npm run dev` — local dev server
- `npm test` — test suite
- `npm run build` — production build (auto-deployed to GitHub Pages on push to master)
- `npm run voice:generate` — regenerate the Sutradhar's ElevenLabs narration
  (needs `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` env vars; keys never enter the repo)

## Credits

- Magazine content © The Pictoreal Club, PICT.
- Music: **"Desert City"** by Kevin MacLeod (incompetech.com) — licensed under
  [Creative Commons: By Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
- Narration voice: "Sanjay" via ElevenLabs.
- Built with Three.js + Vite.
