#!/usr/bin/env node
// Pre-generate the Sutradhar's voice clips with ElevenLabs.
//
// The API key stays on YOUR machine (an env var) and is only used here at build
// time — it never enters the repo or the browser. Clips are written to
// public/voice/*.mp3 with a manifest the game loads at runtime.
//
// Usage (PowerShell):
//   $env:ELEVENLABS_API_KEY="sk_..."; $env:ELEVENLABS_VOICE_ID="<voice id>"; npm run voice:generate
// Usage (bash):
//   ELEVENLABS_API_KEY=sk_... ELEVENLABS_VOICE_ID=<voice id> npm run voice:generate
//
// eleven_multilingual_v2 handles Hindi + English, so the same voice reads both
// the narration and (later) the Hindi magazine articles.

import { writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { magazine } from "../src/content/magazine.config.js";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

if (!API_KEY || !VOICE_ID) {
  console.error("Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID env vars first.");
  console.error("Pick a voice id from https://elevenlabs.io/app/voice-library (choose one that supports Hindi).");
  process.exit(1);
}

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "voice");

// same key function as src/systems/voice.js
function voiceKey(text) {
  const s = String(text).replace(/\s+/g, " ").trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

// every fixed line the game speaks — must mirror the speak() call sites
function collectLines() {
  const s = magazine.sutradhar;
  const lines = [
    ...(s.welcome || []),
    ...(s.descend || []),
    ...(s.arrive || []),
    s.closingComplete,
    s.closingIncomplete,
  ].filter(Boolean);
  for (const tier of magazine.tiers) {
    if (tier.intro) lines.push(tier.intro); // the Sutradhar's section introduction
    for (const p of tier.pages) {
      // matches readText in src/ui/reader.js: `${title}. ${caption}. ${blurb}`
      lines.push(`${p.title}. ${p.caption}. ${p.blurb || ""}`);
    }
  }
  // de-dupe by normalised text
  const seen = new Set();
  return lines.filter((t) => { const k = voiceKey(t); if (seen.has(k)) return false; seen.add(k); return true; });
}

const exists = (p) => access(p).then(() => true, () => false);

async function tts(text) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const lines = collectLines();
  const manifest = {};
  let made = 0, skipped = 0;
  for (const text of lines) {
    const key = voiceKey(text);
    const file = `${key}.mp3`;
    manifest[key] = file;
    const dest = path.join(OUT_DIR, file);
    if (await exists(dest)) { skipped++; continue; }
    process.stdout.write(`· ${text.slice(0, 54)}${text.length > 54 ? "…" : ""}\n`);
    const buf = await tts(text);
    await writeFile(dest, buf);
    made++;
  }
  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${made} generated, ${skipped} already present. Manifest: public/voice/manifest.json`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
