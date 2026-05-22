"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

type Status = "starting" | "scanning" | "blocked";

/** Extract a clue token from a scanned QR payload (full URL or bare token). */
function tokenFromPayload(data: string): string | null {
  const m = data.match(/\/clue\/([^/?#\s]+)/);
  if (m) return m[1];
  // Bare token (no slashes / spaces) — accept as-is.
  if (/^[A-Za-z0-9_-]{6,}$/.test(data.trim())) return data.trim();
  return null;
}

export default function ClueScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const [status, setStatus] = useState<Status>("starting");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const goToClue = useCallback(
    (token: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      stop();
      router.push(`/clue/${encodeURIComponent(token)}`);
    },
    [router, stop],
  );

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const tick = () => {
      if (cancelled || doneRef.current) return;
      if (video.readyState >= 2 && ctx) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          // Downscale to keep decoding cheap.
          const scale = Math.min(1, 480 / Math.max(w, h));
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
          if (result?.data) {
            const token = tokenFromPayload(result.data);
            if (token) {
              goToClue(token);
              return;
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        setStatus("scanning");
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) {
          setStatus("blocked");
          setManualOpen(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [goToClue, stop]);

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/clue/lookup?code=${encodeURIComponent(manualCode.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't find that code.");
        setBusy(false);
        return;
      }
      goToClue(data.token);
    } catch {
      setError("Network error. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="card-noir overflow-hidden">
      <div className="relative bg-black" style={{ aspectRatio: "1 / 1" }}>
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {/* dim room gradient + grain */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.7) 100%)" }}
        />
        <div className="grain" />

        {/* viewfinder: corner brackets + scanline */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2">
          {(["tl", "tr", "bl", "br"] as const).map((corner) => (
            <span
              key={corner}
              className="absolute h-8 w-8"
              style={{
                borderColor: "var(--cyan)",
                boxShadow: "0 0 8px var(--cyan-soft)",
                ...(corner === "tl" && { top: 0, left: 0, borderTop: "2px solid", borderLeft: "2px solid" }),
                ...(corner === "tr" && { top: 0, right: 0, borderTop: "2px solid", borderRight: "2px solid" }),
                ...(corner === "bl" && { bottom: 0, left: 0, borderBottom: "2px solid", borderLeft: "2px solid" }),
                ...(corner === "br" && { bottom: 0, right: 0, borderBottom: "2px solid", borderRight: "2px solid" }),
              }}
            />
          ))}
          {status === "scanning" && (
            <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: "100%" }}>
              <div className="scanline" />
            </div>
          )}
        </div>

        <div className="absolute left-3 top-3">
          <span className={`pill ${status === "scanning" ? "pill-live" : ""}`}>
            <span className="dot" /> {status === "scanning" ? "Scanning" : status === "starting" ? "Starting…" : "Camera off"}
          </span>
        </div>

        <p className="absolute inset-x-0 bottom-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-text-dim">
          {status === "scanning" ? "Aim at the clue tag" : status === "blocked" ? "Camera unavailable" : "Allow camera access"}
        </p>
      </div>

      <div className="p-4">
        {!manualOpen ? (
          <button onClick={() => setManualOpen(true)} className="btn-ghost w-full">
            Enter code manually
          </button>
        ) : (
          <form onSubmit={submitManual} className="flex flex-col gap-2">
            <label className="eyebrow">Enter the clue code from the tag</label>
            <div className="flex gap-2">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="2-1"
                autoComplete="off"
                className="flex-1 border border-border bg-surface px-3 py-2 text-center font-mono text-lg tracking-[0.18em] text-cyan outline-none"
                style={{ caretColor: "var(--cyan)" }}
              />
              <button type="submit" disabled={busy || manualCode.trim() === ""} className="btn-primary">
                {busy ? "…" : "Open"}
              </button>
            </div>
            {error && <p className="text-sm text-blood">{error}</p>}
            {status === "scanning" && (
              <button type="button" onClick={() => setManualOpen(false)} className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                ← Back to camera
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
