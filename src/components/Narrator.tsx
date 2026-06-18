"use client";

import { useEffect, useRef, useState } from "react";
import { isSpeechSupported, speak, stopSpeaking, warmVoices } from "@/lib/narration";

type Props = {
  beats: string[];
  /** Server-side counter; speak only when this changes. */
  seq: number;
  muted: boolean;
};

/**
 * The detective's spoken delivery on the TV. Speaks each fresh narration block
 * once (keyed on `seq`) and shows the line being read as a caption. Honours the
 * mute toggle and never speaks on the phones.
 */
export default function Narrator({ beats, seq, muted }: Props) {
  const [activeBeat, setActiveBeat] = useState(0);
  const lastSeq = useRef<number>(-1);

  useEffect(() => {
    warmVoices();
  }, []);

  useEffect(() => {
    if (seq === lastSeq.current) return;
    lastSeq.current = seq;
    setActiveBeat(0);
    if (muted || !beats.length) {
      stopSpeaking();
      return;
    }
    speak(beats, { onBeat: setActiveBeat });
    return () => stopSpeaking();
  }, [seq, beats, muted]);

  if (!beats.length) return null;

  return (
    <div className="narrator">
      <div className="eyebrow mb-3 text-cyan">The Detective</div>
      <div className="space-y-2">
        {beats.map((line, i) => (
          <p
            key={i}
            className="display text-2xl leading-snug transition-opacity duration-300 md:text-3xl"
            style={{
              color: i === activeBeat && !muted ? "var(--text)" : "var(--text-dim)",
              opacity: muted ? 0.85 : i <= activeBeat ? 1 : 0.4,
            }}
          >
            {line}
          </p>
        ))}
      </div>
      {!isSpeechSupported() && (
        <p className="eyebrow mt-4 text-muted-2">
          (This browser has no speech support — read the lines above aloud.)
        </p>
      )}
    </div>
  );
}
