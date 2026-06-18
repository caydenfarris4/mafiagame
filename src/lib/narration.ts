"use client";

// The Narrator's voice — the browser's built-in Web Speech API (no audio files,
// no API token). The TV speaks each new narration line aloud; phones stay quiet.

let preferredVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (preferredVoice) return preferredVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer a deep, English voice to suit the detective. Fall back to any en-*,
  // then the first available voice.
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    if (/^en/i.test(v.lang)) s += 4;
    if (/(daniel|james|david|google uk english male|male)/i.test(v.name)) s += 3;
    if (/google/i.test(v.name)) s += 1;
    return s;
  };
  preferredVoice = [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
  return preferredVoice;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Speak a list of beats in order. Cancels anything already speaking so the
 * narrator never overlaps itself. `onBeat` fires as each beat starts so the TV
 * can highlight the matching caption.
 */
export function speak(beats: string[], opts: { onBeat?: (i: number) => void; onDone?: () => void } = {}): void {
  if (!isSpeechSupported() || !beats.length) {
    opts.onDone?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  beats.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = 0.94;
    u.pitch = 0.85;
    u.onstart = () => opts.onBeat?.(i);
    if (i === beats.length - 1) u.onend = () => opts.onDone?.();
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

// Some browsers populate voices asynchronously; warm the list once.
export function warmVoices(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    preferredVoice = null;
    pickVoice();
  };
}
