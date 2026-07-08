import { state } from "../state.js";

// Browser text-to-speech (Web Speech API) — free, built-in, no dependencies.
// Used to voice the Sutradhar's narration and to read a page aloud.
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

// Voices load asynchronously; warm the list when they arrive.
let voices = [];
function refreshVoices() {
  voices = synth ? synth.getVoices() : [];
}
if (synth) {
  refreshVoices();
  synth.addEventListener?.("voiceschanged", refreshVoices);
}

function pickVoice() {
  if (!voices.length) refreshVoices();
  return (
    voices.find((v) => /en[-_]IN/i.test(v.lang)) ||
    voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0] ||
    null
  );
}

export function speak(text, { rate = 0.94, pitch = 0.98 } = {}) {
  if (!synth || !state.voiceEnabled || !text) return;
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
}

export function toggleVoice() {
  state.voiceEnabled = !state.voiceEnabled;
  if (!state.voiceEnabled) stopSpeaking();
  return state.voiceEnabled;
}

export function isVoiceEnabled() {
  return state.voiceEnabled;
}
