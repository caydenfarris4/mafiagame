"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bracketed } from "@/components/Atmosphere";
import ClueScanner from "@/components/ClueScanner";

type Section = { heading: string; body: string };
type Clue = { id: string; code: string; title: string; content: string; tag: string; image: string | null };
type Discovery = { id: string; shared: boolean; foundAt: string; clue: Clue };
type Announcement = { id: string; kind: string; title: string; body: string; releasedAt: string };
type PhaseInfo = {
  n: number;
  name: string;
  durationMin: number | null;
  blurb: string;
  open: string[];
  locked: string[];
};

type PlayState = {
  game: { name: string; status: string; currentPhase: number; activeVoteRound: number | null };
  phase: PhaseInfo;
  discoveries: Discovery[];
  announcements: Announcement[];
  myVote: { accusedName: string } | null;
  candidates: string[];
};

type Props = {
  prop: string | null;
  sheet: Section[];
  lastNight: Section[];
  initial: PlayState;
};

const TABS = ["Scan", "Profile", "Timeline", "Phase", "Clues", "Feed"] as const;
type Tab = (typeof TABS)[number];

const PHASE_TRACK = ["Arrival", "Discovery", "Suspicions", "Investigation", "Unmasking", "Architect", "Toast"];

function Sections({ sections }: { sections: Section[] }) {
  return (
    <div className="flex flex-col gap-5">
      {sections.map((s, i) => (
        <div key={i}>
          <h3 className="eyebrow" style={{ color: "var(--cyan)" }}>
            {s.heading}
          </h3>
          <p
            className="mt-1.5 whitespace-pre-wrap leading-relaxed text-text-dim"
            style={{ fontFamily: "var(--font-display)", fontSize: 15 }}
          >
            {s.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function PlayBoard({ prop, sheet, lastNight, initial }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Profile");
  const [state, setState] = useState<PlayState>(initial);
  const [sharing, setSharing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/play/state", { cache: "no-store" });
      if (res.ok) {
        setState(await res.json());
      } else if (res.status === 403) {
        // Host revoked this device mid-game — fall back to the holding screen.
        router.refresh();
      }
    } catch {
      /* ignore transient errors */
    }
  }, [router]);

  useEffect(() => {
    const kick = setTimeout(refresh, 0);
    const t = setInterval(refresh, 5000);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [refresh]);

  async function share(clueId: string) {
    setSharing(clueId);
    try {
      await fetch("/api/play/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clueId }),
      });
      await refresh();
    } finally {
      setSharing(null);
    }
  }

  async function castVote(name: string) {
    await fetch("/api/play/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accusedName: name }),
    });
    await refresh();
  }

  const round = state.game.activeVoteRound;

  return (
    <div className="flex flex-col gap-4">
      {round && (
        <Bracketed>
          <div className="card-noir p-4" style={{ background: "rgba(168,71,79,0.08)", borderColor: "var(--blood-dim)" }}>
            <p className="eyebrow" style={{ color: "var(--blood)" }}>
              {round === 4 ? "Vote · Who killed Richard?" : "Vote · Who was the architect?"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {state.myVote ? `Your ballot: ${state.myVote.accusedName}. You can change it.` : "Anonymous until the reveal."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {state.candidates.map((c) => {
                const picked = state.myVote?.accusedName === c;
                return (
                  <button
                    key={c}
                    onClick={() => castVote(c)}
                    className="px-3 py-1.5 text-sm transition"
                    style={{
                      border: `1px solid ${picked ? "var(--blood)" : "var(--border)"}`,
                      background: picked ? "rgba(168,71,79,0.18)" : "var(--surface)",
                      color: picked ? "#f0d9d9" : "var(--text)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </Bracketed>
      )}

      <nav className="card-noir flex gap-1 overflow-x-auto p-1">
        {TABS.map((t) => {
          const badge =
            t === "Clues" ? state.discoveries.length : t === "Feed" ? state.announcements.length : null;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 whitespace-nowrap px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition"
              style={{
                color: tab === t ? "var(--abyss)" : "var(--muted)",
                background: tab === t ? "var(--cyan)" : "transparent",
              }}
            >
              {t}
              {badge ? <span className="ml-1 opacity-70">{badge}</span> : null}
            </button>
          );
        })}
      </nav>

      {tab === "Scan" && (
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Find a clue tag · scan it</p>
          <ClueScanner />
          <p className="text-center text-xs text-muted" style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>
            Point your camera at a clue&apos;s QR tag. Camera blocked? Enter the code printed on the tag.
          </p>
        </div>
      )}

      {tab === "Profile" && (
        <div className="card-noir flex flex-col gap-5 p-5">
          <p className="eyebrow">Character file · confidential</p>
          <Sections sections={sheet} />
          {prop && (
            <div className="border border-border bg-surface p-3">
              <h3 className="eyebrow" style={{ color: "var(--cyan)" }}>
                Your prop
              </h3>
              <p className="mt-1 text-sm text-foreground">{prop}</p>
            </div>
          )}
        </div>
      )}

      {tab === "Timeline" && (
        <div className="card-noir p-5">
          <p className="eyebrow">Alexander&apos;s reconstruction</p>
          <h2 className="display mt-1 mb-4 text-2xl text-foreground">The Last Night</h2>
          <Sections sections={lastNight} />
        </div>
      )}

      {tab === "Phase" && (
        <div className="card-noir flex flex-col gap-5 p-5">
          <div>
            <p className="eyebrow" style={{ color: "var(--cyan)" }}>
              Phase {state.phase.n}
              {state.phase.durationMin ? ` · ~${state.phase.durationMin} min` : ""}
            </p>
            <h2 className="display mt-1 text-2xl text-foreground">{state.phase.name}</h2>
            <div className="prog-track mt-3">
              {PHASE_TRACK.map((_, i) => (
                <div key={i} className={`prog-cell ${i <= state.phase.n ? "done" : ""}`} />
              ))}
            </div>
            <p className="mt-3 text-sm text-text-dim" style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>
              {state.phase.blurb}
            </p>
          </div>
          <div>
            <h3 className="eyebrow" style={{ color: "var(--cyan)" }}>
              Open to search
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {state.phase.open.map((r) => (
                <li key={r} className="border border-border bg-surface px-3 py-1 text-sm text-foreground">
                  {r}
                </li>
              ))}
            </ul>
          </div>
          {state.phase.locked.length > 0 && (
            <div>
              <h3 className="eyebrow">Still locked</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {state.phase.locked.map((r) => (
                  <li key={r} className="border border-dashed border-border px-3 py-1 text-sm text-muted">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "Clues" && (
        <div>
          <p className="eyebrow mb-3">Evidence log · {state.discoveries.length} collected</p>
          {state.discoveries.length === 0 ? (
            <p className="text-sm text-muted" style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>
              Nothing yet. Explore the open rooms and scan the QR tags you find.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {state.discoveries.map((d) => {
                const keep = d.clue.tag === "KEEP";
                return (
                  <li key={d.id} className="card-noir p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tracking-[0.16em] text-cyan">CLUE {d.clue.code}</span>
                      <span className={`pill ${keep ? "pill-brass" : "pill-live"}`} style={{ marginLeft: "auto" }}>
                        {keep ? "Keep" : "Announce"}
                      </span>
                    </div>
                    <h3 className="display mt-1 text-lg text-foreground">{d.clue.title}</h3>
                    {d.clue.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.clue.image}
                        alt={d.clue.title}
                        className="mt-2 w-full border border-border"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-sm text-text-dim" style={{ fontFamily: "var(--font-display)" }}>
                      {d.clue.content}
                    </p>
                    {keep &&
                      (d.shared ? (
                        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                          ◆ Shared with the house
                        </p>
                      ) : (
                        <button
                          onClick={() => share(d.clue.id)}
                          disabled={sharing === d.clue.id}
                          className="btn-ghost btn-brass mt-3"
                        >
                          {sharing === d.clue.id ? "Sharing…" : "Share with the house"}
                        </button>
                      ))}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "Feed" && (
        <div>
          <p className="eyebrow mb-3">The house feed</p>
          {state.announcements.length === 0 ? (
            <p className="text-sm text-muted" style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>
              Nothing has been announced to the house yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {state.announcements.map((a) => {
                const solomon = a.kind === "SOLOMON";
                return (
                  <li
                    key={a.id}
                    className="card-noir p-4"
                    style={solomon ? { borderColor: "var(--brass-dim)", background: "rgba(196,167,113,0.05)" } : undefined}
                  >
                    <h3
                      className="font-mono text-[11px] uppercase tracking-[0.18em]"
                      style={{ color: solomon ? "var(--brass)" : "var(--cyan)" }}
                    >
                      {solomon ? "🦜 Solomon" : a.title}
                    </h3>
                    <p
                      className="mt-1.5 whitespace-pre-wrap text-foreground"
                      style={{ fontFamily: "var(--font-display)", fontSize: 15, fontStyle: solomon ? "italic" : "normal" }}
                    >
                      {a.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
