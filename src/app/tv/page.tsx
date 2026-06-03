"use client";

import { useCallback, useState } from "react";
import { Atmosphere, Bracketed, Wordmark } from "@/components/Atmosphere";
import Narrator from "@/components/Narrator";
import { useGame, type GameState } from "@/lib/useGame";

const STAGE_LABELS: Record<string, string> = {
  lobby: "Lobby",
  opening: "The Detective",
  sheets: "Read your sheet",
  introductions: "Introductions",
  rules: "The Rules",
  clue_drop: "Clue Drop",
  mingle: "Mingle",
  hotseat_vote: "Hotseat Vote",
  interrogation: "Interrogation",
  final_vote: "Final Vote",
  reveal: "The Truth",
};

export default function TvPage() {
  const [muted, setMuted] = useState(false);
  const onOpen = useCallback((send: (m: object) => void) => send({ type: "create" }), []);
  const { state, status, send } = useGame({ onOpen });

  if (!state || status !== "open") {
    return (
      <Shell>
        <div className="text-center">
          <Wordmark size={56} />
          <p className="eyebrow mt-8 text-muted">
            {status === "open" ? "Setting the table…" : "Connecting to the game server…"}
          </p>
        </div>
      </Shell>
    );
  }

  const stage = state.stage as string;
  const beats = (state.narration as string[]) ?? [];
  const seq = (state.narrationSeq as number) ?? 0;

  return (
    <Shell>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-6 py-8">
        {/* Top bar: stage + timer + controls */}
        <header className="flex items-center justify-between">
          <div>
            <div className="eyebrow text-cyan">{STAGE_LABELS[stage] ?? stage}</div>
            {(state.roundNumber as number) > 0 && stage !== "reveal" && (
              <div className="font-mono text-xs text-muted-2">Round {state.roundNumber as number} of 3</div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {typeof state.secondsLeft === "number" && (state.secondsLeft as number) > 0 && (
              <Timer seconds={state.secondsLeft as number} />
            )}
            <button
              onClick={() => setMuted((m) => !m)}
              className="rounded border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-text"
            >
              {muted ? "🔇 Muted" : "🔊 Voice"}
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          <StageView state={state} />
        </div>

        {/* Narrator captions + host controls */}
        {beats.length > 0 && stage !== "lobby" && (
          <div className="mb-6">
            <Narrator beats={beats} seq={seq} muted={muted} />
          </div>
        )}

        <HostControls state={state} send={send} />
      </div>
    </Shell>
  );
}

function StageView({ state }: { state: GameState }) {
  const stage = state.stage as string;
  switch (stage) {
    case "lobby":
      return <Lobby state={state} />;
    case "introductions":
      return <Introduction state={state} />;
    case "clue_drop":
    case "mingle":
    case "hotseat_vote":
    case "interrogation":
      return <RoundView state={state} />;
    case "final_vote":
      return <FinalBoard state={state} />;
    case "reveal":
      return <Reveal state={state} />;
    default:
      return <ScenarioCard state={state} />;
  }
}

function Lobby({ state }: { state: GameState }) {
  const players = (state.players as { id: string; name: string }[]) ?? [];
  const origin = typeof window !== "undefined" ? window.location.host : "";
  return (
    <div className="text-center">
      <div className="eyebrow text-muted">Join from your phone at</div>
      <div className="display mt-1 text-xl text-text-dim">{origin || "this site"}</div>
      <Bracketed brass className="mx-auto mt-6 inline-block px-10 py-6">
        <div className="eyebrow text-muted">Room code</div>
        <div className="display text-7xl tracking-[0.3em] text-cyan md:text-8xl">
          {state.roomCode as string}
        </div>
      </Bracketed>

      <div className="mt-10">
        <div className="eyebrow text-muted">
          {players.length} {players.length === 1 ? "guest" : "guests"} seated · need 4–10
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {players.map((p) => (
            <span key={p.id} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-text">
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ state }: { state: GameState }) {
  const scenario = state.scenario as { location: string; time: string; timeWindow: string } | undefined;
  if (!scenario) return null;
  return (
    <div className="text-center">
      <div className="eyebrow text-muted">The scene</div>
      <div className="display mt-3 text-4xl text-text md:text-5xl">{scenario.location}</div>
      <div className="mt-2 font-mono text-sm uppercase tracking-[0.2em] text-blood">
        {scenario.time} · {scenario.timeWindow}
      </div>
    </div>
  );
}

function Introduction({ state }: { state: GameState }) {
  const intro = state.introduction as
    | { name: string; archetype: string; background: string; personality: string; relationship: string; alibi: string }
    | undefined;
  if (!intro) return null;
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="eyebrow text-muted">
        Read aloud · {(state.introIndex as number) + 1} of {state.introTotal as number}
      </div>
      <div className="display mt-3 text-4xl text-text">{intro.name}</div>
      <div className="mt-1 font-mono text-xs uppercase tracking-[0.25em] text-cyan">{intro.archetype}</div>
      <div className="mt-6 space-y-3 text-left text-lg leading-relaxed text-text-dim">
        <p>{intro.background}</p>
        <p>{intro.personality}</p>
        <p className="text-text">{intro.relationship}</p>
        <p className="italic text-muted">{intro.alibi}</p>
      </div>
    </div>
  );
}

function RoundView({ state }: { state: GameState }) {
  const clues = (state.clues as { text: string; placeholder: boolean }[]) ?? [];
  const stage = state.stage as string;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <ScenarioCard state={state} />
      {(state.tampered as boolean) && (
        <div className="mt-6 rounded-md border border-blood-dim bg-blood/10 px-4 py-3 text-center font-mono text-xs uppercase tracking-[0.15em] text-blood">
          ⚠ The culprit has tampered with the evidence. One clue has been replaced.
        </div>
      )}
      <div className="mt-6 space-y-3">
        {clues.map((c, i) => (
          <Bracketed key={i} className="px-5 py-4">
            <div className="flex gap-4">
              <span className="font-mono text-sm text-cyan">{String(i + 1).padStart(2, "0")}</span>
              <p className={`text-lg ${c.placeholder ? "italic text-muted-2" : "text-text"}`}>{c.text}</p>
            </div>
          </Bracketed>
        ))}
      </div>

      {stage === "hotseat_vote" && (
        <div className="mt-8 text-center">
          <div className="eyebrow text-cyan">Vote on your phone</div>
          <div className="display mt-1 text-3xl text-text">{(state.votesIn as number) ?? 0} votes in</div>
        </div>
      )}
      {stage === "interrogation" && (
        <div className="mt-8 text-center">
          <div className="eyebrow text-blood">In the hotseat</div>
          <div className="display mt-1 text-4xl text-text">{state.hotseatName as string}</div>
          <p className="mt-2 text-sm text-muted">Open floor. Anyone may ask anything.</p>
        </div>
      )}
      {(state.emergency as { active: boolean } | undefined)?.active && (
        <div className="mt-8 rounded-md border border-blood bg-blood/15 px-4 py-3 text-center">
          <div className="eyebrow text-blood">Emergency vote</div>
          <div className="display text-2xl text-text">Name the killer now</div>
        </div>
      )}
    </div>
  );
}

function FinalBoard({ state }: { state: GameState }) {
  const board = (state.board as { id: string; name: string; M: number; A: number }[]) ?? [];
  const hasA = state.hasAccomplice as boolean;
  const maxM = Math.max(1, ...board.map((b) => b.M));
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="text-center">
        <div className="eyebrow text-blood">The police have arrived</div>
        <div className="display mt-1 text-3xl text-text">Who should they arrest?</div>
      </div>
      <div className="mt-8 space-y-2">
        {board.map((b) => (
          <div key={b.id} className="flex items-center gap-4 rounded-md border border-border bg-card px-4 py-3">
            <span className="w-40 truncate text-lg text-text">{b.name}</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface">
              <div className="absolute inset-y-0 left-0 bg-blood" style={{ width: `${(b.M / maxM) * 100}%` }} />
            </div>
            <span className="w-24 text-right font-mono text-sm text-text">
              {b.M}M{hasA ? ` · ${b.A}A` : ""}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Drag your tokens on your phone. You may change them until the clock hits zero.
      </p>
    </div>
  );
}

function Reveal({ state }: { state: GameState }) {
  const result = state.result as { innocents_won: boolean; murderer: string; accomplice: string | null } | undefined;
  const scores = (state.sittingScores as Record<string, number>) ?? {};
  if (!result) return null;
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className={`display text-5xl ${result.innocents_won ? "text-cyan" : "text-blood"}`}>
        {result.innocents_won ? "Innocents win" : "The killer walks free"}
      </div>
      <div className="mt-8 space-y-2 text-xl text-text-dim">
        <p>
          <span className="text-blood">{result.murderer}</span> killed Richard.
        </p>
        {result.accomplice && (
          <p>
            <span className="text-blood">{result.accomplice}</span> helped cover it up.
          </p>
        )}
      </div>
      {Object.keys(scores).length > 0 && (
        <p className="mt-8 eyebrow text-muted">Game {state.gameNumber as number} complete</p>
      )}
    </div>
  );
}

function HostControls({ state, send }: { state: GameState; send: (m: object) => void }) {
  const stage = state.stage as string;
  const count = (state.playerCount as number) ?? 0;

  if (stage === "lobby") {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => send({ type: "start" })}
          disabled={count < 4}
          className="rounded-md bg-cyan/20 px-10 py-4 font-mono text-sm uppercase tracking-[0.22em] text-cyan transition-colors hover:bg-cyan/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {count < 4 ? `Waiting for players (${count}/4)` : "Begin the game"}
        </button>
      </div>
    );
  }

  if (stage === "reveal") {
    return (
      <div className="flex justify-center">
        <button
          onClick={() => send({ type: "next_game" })}
          className="rounded-md bg-brass/20 px-10 py-4 font-mono text-sm uppercase tracking-[0.22em] text-brass transition-colors hover:bg-brass/30"
        >
          Next game
        </button>
      </div>
    );
  }

  // Timed stages auto-advance; everything else waits for the host to continue.
  const auto = stage === "mingle" || stage === "interrogation" || stage === "final_vote";
  return (
    <div className="flex justify-center">
      <button
        onClick={() => send({ type: "advance" })}
        className="rounded-md border border-border px-10 py-3 font-mono text-xs uppercase tracking-[0.22em] text-muted transition-colors hover:border-cyan hover:text-cyan"
      >
        {auto ? "Skip ahead" : "Continue ›"}
      </button>
    </div>
  );
}

function Timer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const low = seconds <= 10;
  return (
    <div className={`font-mono text-2xl tabular-nums ${low ? "text-blood" : "text-cyan"}`}>
      {m}:{String(s).padStart(2, "0")}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <Atmosphere intensity={2} tide />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </main>
  );
}
