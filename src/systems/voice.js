import { state } from "../state.js";

// The Sutradhar's voice. Two tiers, chosen automatically per line:
//   1. Pre-generated ElevenLabs clips (high quality, Hindi-capable) if present.
//      A build step (scripts/generate-voice.mjs) renders every fixed line to
//      public/voice/<key>.mp3 and writes a manifest; the API key never ships.
//   2. Browser text-to-speech (Web Speech API) as a free fallback for any text
//      that has no clip (e.g. dynamic content), preferring an Indian voice.

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

// ---- stable key for a line of text (must match generate-voice.mjs) ----
export function voiceKey(text) {
  const s = String(text).replace(/\s+/g, " ").trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

// ---- pre-generated clip manifest (loaded once, best-effort) ----
let manifest = null;
if (typeof fetch !== "undefined") {
  fetch("/voice/manifest.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => { manifest = m; })
    .catch(() => {});
}

// ---- browser TTS voice selection (Indian-accented preferred) ----
let voices = [];
function refreshVoices() { voices = synth ? synth.getVoices() : []; }
if (synth) { refreshVoices(); synth.addEventListener?.("voiceschanged", refreshVoices); }
const INDIAN_NAME = /(ravi|heera|rishi|veena|aditi|kajal|priya|neerja|prabhat|lekha|india|hindi)/i;
function pickVoice() {
  if (!voices.length) refreshVoices();
  return (
    voices.find((v) => INDIAN_NAME.test(v.name) && /^en/i.test(v.lang)) ||
    voices.find((v) => /en[-_]IN/i.test(v.lang)) ||
    voices.find((v) => INDIAN_NAME.test(v.name)) ||
    voices.find((v) => /hi[-_]IN/i.test(v.lang)) ||
    voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0] || null
  );
}

// ---- playback state (covers both a clip and the synth) ----
let audio = null; // current HTMLAudioElement

export function speak(text, { rate = 0.9, pitch = 0.92 } = {}) {
  if (!state.voiceEnabled || !text) return;
  stopSpeaking();

  // 1. a pre-generated ElevenLabs clip, if we have one for this exact line
  const file = manifest && manifest[voiceKey(text)];
  if (file) {
    audio = new Audio(`/voice/${file}`);
    audio.play().catch(() => { audio = null; speakSynth(text, rate, pitch); });
    audio.addEventListener("ended", () => { audio = null; });
    return;
  }
  // 2. browser TTS fallback
  speakSynth(text, rate, pitch);
}

function speakSynth(text, rate, pitch) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, " ").trim());
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = rate;
  u.pitch = pitch;
  synth.speak(u);
}

export function stopSpeaking() {
  synth?.cancel();
  if (audio) { audio.pause(); audio.currentTime = 0; audio = null; }
}

export function toggleVoice() {
  state.voiceEnabled = !state.voiceEnabled;
  if (!state.voiceEnabled) stopSpeaking();
  return state.voiceEnabled;
}

export function isVoiceEnabled() { return state.voiceEnabled; }

export function isSpeaking() {
  return (!!audio && !audio.paused && !audio.ended) || (!!synth && synth.speaking);
}
