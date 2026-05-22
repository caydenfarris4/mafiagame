"use client";

// WebAudio drip ambience for the splash. Lazy-init — browsers block AudioContext
// until a user gesture, so call startAmbience() from a click/tap handler.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  return ctx;
}

/** A single drip: short pitched sine with a fast envelope + a tiny noise splash. */
export function playDrip(pitchHz = 480) {
  const c = getCtx();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume();
  const now = c.currentTime;

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(pitchHz * 2.2, now);
  osc.frequency.exponentialRampToValueAtTime(pitchHz, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(pitchHz * 0.7, now + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.6, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
  osc.connect(g).connect(master);
  osc.start(now);
  osc.stop(now + 0.35);

  const len = Math.floor(c.sampleRate * 0.12);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.4;
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = pitchHz * 1.5;
  filt.Q.value = 6;
  const ng = c.createGain();
  ng.gain.value = 0.5;
  noise.connect(filt).connect(ng).connect(master);
  noise.start(now);
  noise.stop(now + 0.12);
}

/** Looping ambient drips at random pitch/interval. Safe to call repeatedly. */
export function startAmbience() {
  if (enabled) return;
  enabled = true;
  const tick = () => {
    if (!enabled) return;
    playDrip(320 + Math.random() * 300);
    timer = setTimeout(tick, 700 + Math.random() * 1900);
  };
  tick();
}

export function stopAmbience() {
  enabled = false;
  if (timer) clearTimeout(timer);
  timer = null;
}

export function isAmbienceOn() {
  return enabled;
}
