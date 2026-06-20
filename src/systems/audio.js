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
