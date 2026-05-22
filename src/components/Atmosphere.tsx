"use client";

import { useEffect, useState } from "react";

type DropLayerProps = {
  intensity?: number; // 0–10
  puddleHeight?: number;
  showPuddle?: boolean;
};

type Drop = { left: number; delay: number; duration: number; opacity: number; ripple: number };

/** Falling water drops that splash into the puddle line. */
export function DropLayer({ intensity = 4, puddleHeight = 0, showPuddle = false }: DropLayerProps) {
  const count = Math.round(intensity * 3.5);
  // Generated client-side in an effect (keeps render pure + avoids SSR mismatch).
  const [drops, setDrops] = useState<Drop[]>([]);
  useEffect(() => {
    const id = setTimeout(() => {
      const arr: Drop[] = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          left: 4 + Math.random() * 92,
          delay: -Math.random() * 7,
          duration: 4.5 + Math.random() * 4.5,
          opacity: 0.45 + Math.random() * 0.55,
          ripple: 0.7 + Math.random() * 0.7,
        });
      }
      setDrops(arr);
    }, 0);
    return () => clearTimeout(id);
  }, [count]);

  return (
    <div className="drop-layer">
      {drops.map((d, i) => (
        <div key={i}>
          <div
            className="drop"
            style={
              {
                left: `${d.left}%`,
                animationDelay: `${d.delay}s`,
                animationDuration: `${d.duration}s`,
                opacity: d.opacity,
                "--fall": `calc(100% - ${puddleHeight + 4}px)`,
              } as React.CSSProperties
            }
          />
          {showPuddle && (
            <>
              <div
                className="impact"
                style={{
                  left: `${d.left}%`,
                  bottom: `${puddleHeight - 2}px`,
                  animationDelay: `${d.delay}s`,
                  animationDuration: `${d.duration}s`,
                  transform: `translate(-50%, -50%) scale(${d.ripple})`,
                }}
              />
              <div
                className="impact-splash"
                style={{
                  left: `${d.left}%`,
                  bottom: `${puddleHeight}px`,
                  animationDelay: `${d.delay}s`,
                  animationDuration: `${d.duration}s`,
                }}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export function Puddle({ height = 64 }: { height?: number }) {
  return (
    <div className="puddle" style={{ height }}>
      <div className="puddle-surface" />
      <div className="puddle-shine" />
      <div className="puddle-shimmer" />
    </div>
  );
}

/** Fog + vignette + grain wash, optionally with drips and a tide glow. */
export function Atmosphere({
  intensity = 1,
  tide = false,
}: {
  intensity?: number;
  tide?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {tide && <div className="tide" />}
      <div className="fog" />
      {intensity > 0 && <DropLayer intensity={intensity} />}
      <div className="vignette" />
      <div className="grain" />
    </div>
  );
}

export function Bracketed({
  children,
  className = "",
  brass = false,
}: {
  children: React.ReactNode;
  className?: string;
  brass?: boolean;
}) {
  return (
    <div className={`bracketed ${brass ? "brass-brackets" : ""} ${className}`}>
      {children}
      <span className="br-c1" />
      <span className="br-c2" />
    </div>
  );
}

export function Wordmark({ size = 50 }: { size?: number }) {
  return (
    <div className="text-center">
      <div
        className="display"
        style={{
          fontSize: size,
          lineHeight: 1.05,
          color: "var(--text)",
          letterSpacing: "0.08em",
          fontWeight: 400,
          textShadow: "0 2px 30px rgba(95,184,200,0.25)",
        }}
      >
        DEAD
        <div
          style={{
            fontStyle: "italic",
            fontSize: size * 0.72,
            margin: "2px 0",
            color: "var(--text-dim)",
          }}
        >
          in the
        </div>
        <div style={{ letterSpacing: "0.12em" }}>WATER</div>
      </div>
      <div
        className="font-mono"
        style={{ marginTop: 18, fontSize: 10, letterSpacing: "0.38em", color: "var(--cyan)" }}
      >
        A PARLOUR MURDER
      </div>
    </div>
  );
}
