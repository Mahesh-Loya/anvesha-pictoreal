# Sutradhar voice (ElevenLabs)

The game speaks narration and reads pages aloud. It uses **pre-generated
ElevenLabs clips** when present, and falls back to the browser's built-in
text-to-speech otherwise. `eleven_multilingual_v2` handles **Hindi and English**,
so the same voice can narrate and read Hindi articles.

## Why pre-generate (instead of calling the API from the browser)

- **Your API key never ships.** It's used only on your machine at build time.
- **You pay once per line, not per playback** — replays are free and instant.
- **Works offline** in the browser and has no latency while playing.

## One-time setup

1. Pick a voice at <https://elevenlabs.io/app/voice-library> (choose one that
   supports Hindi) and copy its **Voice ID**.
2. Generate the clips (key stays in the env var, never in the repo):

   PowerShell:
   ```powershell
   $env:ELEVENLABS_API_KEY="sk_..."; $env:ELEVENLABS_VOICE_ID="<voice id>"; npm run voice:generate
   ```
   bash:
   ```bash
   ELEVENLABS_API_KEY=sk_... ELEVENLABS_VOICE_ID=<voice id> npm run voice:generate
   ```

This writes `public/voice/*.mp3` and `public/voice/manifest.json`. Commit those
audio files (not the key). Re-run after editing text in
`src/content/magazine.config.js` — existing clips are skipped, only new/changed
lines are generated.

## Adding Hindi articles later

Put the Hindi text in the page `blurb` (or `title`/`caption`) in
`magazine.config.js` and re-run `npm run voice:generate`. The reader speaks
`"<title>. <caption>. <blurb>"`, so that exact line gets a Hindi clip.

## Optional: live (dynamic) narration

For text not known ahead of time, add a tiny server proxy that holds the key and
calls `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`; point the
game at it. Not needed for the fixed magazine content.
