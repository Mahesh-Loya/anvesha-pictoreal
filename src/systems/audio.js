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

// ---- ambient music: a slow evolving raga-ish drone (synthesized, no files) ----
let musicMaster = null;
const MUSIC_VOL = 0.06;

export function startAmbientMusic() {
  if (musicMaster) return;
  const c = getContext();
  musicMaster = c.createGain();
  musicMaster.gain.value = state.audioMuted ? 0 : MUSIC_VOL;
  musicMaster.connect(c.destination);

  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 620;
  filt.Q.value = 2;
  filt.connect(musicMaster);

  // a tanpura-like drone: tonic + fifth, gently detuned
  [110, 110.4, 164.8, 220].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = i === 3 ? "triangle" : "sine";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = [0.5, 0.5, 0.22, 0.12][i];
    o.connect(g);
    g.connect(filt);
    o.start();
  });
  // slow filter sweep for movement
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.045;
  const lg = c.createGain();
  lg.gain.value = 240;
  lfo.connect(lg);
  lg.connect(filt.frequency);
  lfo.start();

  // occasional soft bell tones from a pentatonic set
  const notes = [523.25, 587.33, 659.25, 783.99, 880];
  let n = 0;
  setInterval(() => {
    if (state.audioMuted) return;
    const f = notes[(n = (n + 3) % notes.length)];
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.4);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 3.5);
    o.connect(g);
    g.connect(musicMaster);
    o.start();
    o.stop(c.currentTime + 3.6);
  }, 5200);
}

export function toggleMute() {
  state.audioMuted = !state.audioMuted;
  if (musicMaster) musicMaster.gain.value = state.audioMuted ? 0 : MUSIC_VOL;
  return state.audioMuted;
}

export function isMuted() {
  return state.audioMuted;
}
