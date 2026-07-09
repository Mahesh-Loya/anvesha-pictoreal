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

// Prefer an Indian-accented English voice for the Sutradhar. Names vary by OS:
// Windows ships "Ravi"/"Heera" (en-IN); Android/Chrome ship "Hindi (India)" and
// en-IN Google voices; macOS/iOS ship "Rishi"/"Veena".
const INDIAN_NAME = /(ravi|heera|rishi|veena|aditi|kajal|priya|neerja|india|hindi|prabhat|lekha)/i;
function pickVoice() {
  if (!voices.length) refreshVoices();
  return (
    voices.find((v) => INDIAN_NAME.test(v.name) && /^en/i.test(v.lang)) || // en-IN by name
    voices.find((v) => /en[-_]IN/i.test(v.lang)) ||                         // en-IN by locale
    voices.find((v) => INDIAN_NAME.test(v.name)) ||                          // any Indian voice
    voices.find((v) => /hi[-_]IN/i.test(v.lang)) ||                          // Hindi as a last Indian option
    voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0] ||
    null
  );
}

// a warm, measured storyteller cadence
export function speak(text, { rate = 0.9, pitch = 0.92 } = {}) {
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

export function isSpeaking() {
  return !!synth && synth.speaking;
}
