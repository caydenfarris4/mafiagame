"use client";

// WebAudio drip ambience for the splash. Lazy-init — browsers block AudioContext
// until a user gesture, so call startAmbience() from a click/tap handler.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let timer: ReturnType<typeof setTimeout> | null = null;

// A short decaying-noise impulse → a small, damp room for the drips to echo in.
function makeImpulse(c: AudioContext, seconds = 1.4, decay = 3): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.3;

      // Dry path + a wet reverb path so each drip rings out like it's in a room.
      const dry = ctx.createGain();
      dry.gain.value = 0.9;
      master.connect(dry).connect(ctx.destination);

      const convolver = ctx.createConvolver();
      convolver.buffer = makeImpulse(ctx, 1.4, 3);
      const wet = ctx.createGain();
      wet.gain.value = 0.5;
      master.connect(convolver).connect(wet).connect(ctx.destination);
    } catch {
      return null;
    }
  }
  return ctx;
}

/** A single water drip: a fast falling-pitch "ploink" plus a short splash. */
export function playDrip(pitchHz = 700) {
  const c = getCtx();
  if (!c || !master) return;
  if (c.state === "suspended") c.resume();
  const now = c.currentTime;

  // Pitched body — a quick, deep pitch drop is what reads as "a drop of water".
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(pitchHz * 3.2, now);
  osc.frequency.exponentialRampToValueAtTime(pitchHz, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(pitchHz * 0.45, now + 0.22);

  // A gentle resonance on the body, like the ring of a droplet hitting water.
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = pitchHz * 1.3;
  bp.Q.value = 2;

  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.55, now + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

  osc.connect(bp).connect(g).connect(master);
  osc.start(now);
  osc.stop(now + 0.38);

  // Crisp surface "tick" at the moment of contact.
  const tick = c.createOscillator();
  tick.type = "triangle";
  tick.frequency.setValueAtTime(pitchHz * 5, now);
  tick.frequency.exponentialRampToValueAtTime(pitchHz * 2, now + 0.02);
  const tg = c.createGain();
  tg.gain.setValueAtTime(0.18, now);
  tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  tick.connect(tg).connect(master);
  tick.start(now);
  tick.stop(now + 0.06);

  // Tiny filtered-noise splash.
  const len = Math.floor(c.sampleRate * 0.09);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.35;
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const nf = c.createBiquadFilter();
  nf.type = "bandpass";
  nf.frequency.value = pitchHz * 1.8;
  nf.Q.value = 8;
  const ng = c.createGain();
  ng.gain.value = 0.4;
  noise.connect(nf).connect(ng).connect(master);
  noise.start(now);
  noise.stop(now + 0.09);
}

/** Looping ambient drips at random pitch/interval. Safe to call repeatedly. */
export function startAmbience() {
  if (enabled) return;
  enabled = true;
  const tick = () => {
    if (!enabled) return;
    playDrip(520 + Math.random() * 520);
    timer = setTimeout(tick, 500 + Math.random() * 2000);
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
