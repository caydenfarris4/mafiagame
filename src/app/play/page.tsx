"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Atmosphere, Wordmark } from "@/components/Atmosphere";
import { useGame, type GameState } from "@/lib/useGame";

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}

function PlayInner() {
  const params = useSearchParams();
  const code = (params.get("code") ?? "").toUpperCase();
  const storageKey = `ditw:${code}`;

  // Restore a prior session for this room so a refresh rejoins automatically.
  // Read synchronously at first render (guarded for SSR) to avoid a setState
  // round-trip in an effect.
  const [playerId, setPlayerId] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null,
  );
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  const onOpen = useCallback(
    (send: (m: object) => void) => {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (saved) send({ type: "reconnect", code, playerId: saved });
    },
    [code, storageKey],
  );

  const onMessage = useCallback(
    (msg: Record<string, unknown>) => {
      if (msg.type === "joined") {
        const id = String(msg.playerId);
        setPlayerId(id);
        setJoined(true);
        if (typeof window !== "undefined") window.localStorage.setItem(storageKey, id);
      }
    },
    [storageKey],
  );

  const { state, status, error, send, clearError } = useGame({ role: "player", code, onOpen, onMessage });

  const submitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) send({ type: "join", code, name: name.trim(), gender, playerId });
  };

  if (!code) {
    return <Center><p className="text-text-dim">No room code. Go back and enter one.</p></Center>;
  }

  // Join form until the server confirms us in the room.
  if (!joined && !state) {
    return (
      <Center>
        <Wordmark size={44} />
        <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Room {code}
        </p>
        {error && <ErrorNote error={error} onDismiss={clearError} />}
        <form onSubmit={submitJoin} className="mt-8 w-full space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Your name"
            className="w-full rounded-md border border-border bg-surface px-4 py-4 text-center text-lg text-text placeholder:text-muted-2 focus:border-cyan focus:outline-none"
          />
          <div className="flex gap-3">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 rounded-md border py-3 font-mono text-xs uppercase tracking-[0.15em] ${
                  gender === g ? "border-cyan bg-cyan/15 text-cyan" : "border-border text-muted"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!name.trim() || status !== "open"}
            className="w-full rounded-md bg-cyan/20 py-4 font-mono text-sm uppercase tracking-[0.22em] text-cyan disabled:opacity-40"
          >
            {status === "open" ? "Take a seat" : "Connecting…"}
          </button>
        </form>
      </Center>
    );
  }

  if (!state) {
    return <Center><p className="eyebrow text-muted">Joining…</p></Center>;
  }

  return (
    <Center wide>
      {error && <ErrorNote error={error} onDismiss={clearError} />}
      <PhoneStage state={state} send={send} />
    </Center>
  );
}

function PhoneStage({ state, send }: { state: GameState; send: (m: object) => void }) {
  const stage = state.stage as string;
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheet = state.sheet as Sheet | undefined;

  return (
    <div className="w-full">
      <Header state={state} onSheet={sheet ? () => setSheetOpen(true) : undefined} />

      <div className="mt-6">
        {stage === "lobby" && <Waiting />}
        {stage === "sheets" && sheet && <SheetView sheet={sheet} />}
        {stage === "introductions" && <ReadAloud state={state} />}
        {(stage === "rules" || stage === "clue_drop" || stage === "opening") && (
          <WatchTv label="Watch the TV — the detective is speaking." />
        )}
        {stage === "mingle" && <MingleView state={state} send={send} />}
        {stage === "hotseat_vote" && <HotseatVote state={state} send={send} />}
        {stage === "interrogation" && <WatchTv label="Interrogation underway. Ask anything." />}
        {stage === "final_vote" && <FinalVote state={state} send={send} />}
        {stage === "reveal" && <RevealView state={state} />}
      </div>

      {(state.emergency as { active: boolean } | undefined)?.active && (
        <EmergencyBallot state={state} send={send} />
      )}

      {sheetOpen && sheet && <SheetOverlay sheet={sheet} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}

type Sheet = {
  name: string;
  archetype: string;
  background: string;
  personality: string;
  relationship: string;
  alibi: string;
  secret: string;
  role: string;
  theTruth?: string;
  conspirator?: string;
};

function Header({ state, onSheet }: { state: GameState; onSheet?: () => void }) {
  const sheet = state.sheet as Sheet | undefined;
  const persona = sheet?.name ?? (state.name as string);
  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <div>
        <div className="text-lg text-text">{persona}</div>
        {sheet && <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">{sheet.archetype}</div>}
      </div>
      {onSheet && (
        <button
          onClick={onSheet}
          className="rounded border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted"
        >
          My sheet
        </button>
      )}
    </div>
  );
}

function Waiting() {
  return (
    <div className="py-16 text-center">
      <div className="eyebrow text-cyan">You&apos;re in</div>
      <p className="mt-3 text-text-dim">Waiting for the host to begin…</p>
    </div>
  );
}

function WatchTv({ label }: { label: string }) {
  return (
    <div className="py-16 text-center">
      <div className="text-3xl">📺</div>
      <p className="mt-4 text-text-dim">{label}</p>
    </div>
  );
}

function SheetView({ sheet }: { sheet: Sheet }) {
  return (
    <div>
      <div className="eyebrow text-cyan">Your character — read privately</div>
      <SheetBody sheet={sheet} />
    </div>
  );
}

function SheetBody({ sheet }: { sheet: Sheet }) {
  const guilty = sheet.role === "murderer" || sheet.role === "accomplice";
  return (
    <div className="mt-4 space-y-4 text-text-dim">
      <Field label="Background" value={sheet.background} />
      <Field label="Personality" value={sheet.personality} />
      <Field label="You & Richard" value={sheet.relationship} />
      <Field label="Your alibi" value={sheet.alibi} />
      <Field label="Your secret" value={sheet.secret} accent />
      {guilty && (
        <div className="rounded-md border border-blood-dim bg-blood/10 p-4">
          <div className="eyebrow text-blood">
            {sheet.role === "murderer" ? "You are the murderer" : "You are the accomplice"}
          </div>
          {sheet.theTruth && <p className="mt-2 text-text">{sheet.theTruth}</p>}
          {sheet.conspirator && (
            <p className="mt-2 text-sm text-text-dim">
              Your partner: <span className="text-text">{sheet.conspirator}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="eyebrow text-muted">{label}</div>
      <p className={`mt-1 ${accent ? "text-text" : "text-text-dim"}`}>{value}</p>
    </div>
  );
}

function ReadAloud({ state }: { state: GameState }) {
  const sheet = state.sheet as Sheet | undefined;
  return (
    <div className="py-12 text-center">
      <div className="eyebrow text-cyan">Introductions</div>
      <p className="mt-3 text-text-dim">
        When <span className="text-text">{sheet?.name}</span> appears on the TV, read the introduction aloud —
        exactly as shown.
      </p>
    </div>
  );
}

function MingleView({ state, send }: { state: GameState; send: (m: object) => void }) {
  const available = state.emergencyAvailable as boolean | undefined;
  const players = (state.players as Roster) ?? [];
  const myFlag = state.myEmergencyFlag as string | undefined;
  return (
    <div>
      <div className="py-8 text-center">
        <div className="text-3xl">🗣️</div>
        <p className="mt-3 text-text-dim">Mingle. Move around, talk, make your case.</p>
      </div>
      {available && (
        <div className="rounded-md border border-border bg-card p-4">
          <div className="eyebrow text-blood">Emergency vote</div>
          <p className="mt-1 text-sm text-muted">
            If every innocent flags the same person, a 30-second vote opens. Flag your suspect:
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => send({ type: "emergency_flag", target: myFlag === p.id ? null : p.id })}
                className={`rounded-md border py-2 text-sm ${
                  myFlag === p.id ? "border-blood bg-blood/15 text-blood" : "border-border text-text-dim"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type Roster = { id: string; name: string }[];

function HotseatVote({ state, send }: { state: GameState; send: (m: object) => void }) {
  const players = (state.players as Roster) ?? [];
  const myVote = state.myVote as string | undefined;
  const bannedId = state.bannedId as string | undefined;
  const canBan = state.canBan as boolean | undefined;
  const myBan = state.myBan as string | undefined;
  return (
    <div>
      <div className="eyebrow text-cyan">Who takes the hotseat?</div>
      <div className="mt-4 space-y-2">
        {players.map((p) => {
          const banned = p.id === bannedId;
          return (
            <button
              key={p.id}
              disabled={banned}
              onClick={() => send({ type: "hotseat_vote", target: p.id })}
              className={`flex w-full items-center justify-between rounded-md border px-4 py-3 ${
                myVote === p.id ? "border-cyan bg-cyan/15 text-cyan" : "border-border text-text"
              } ${banned ? "opacity-40" : ""}`}
            >
              <span>{p.name}</span>
              {myVote === p.id && <span className="font-mono text-xs">✓ voted</span>}
              {banned && <span className="font-mono text-[10px] uppercase text-blood">blocked</span>}
            </button>
          );
        })}
      </div>

      {canBan && (
        <div className="mt-6 rounded-md border border-blood-dim bg-blood/10 p-4">
          <div className="eyebrow text-blood">Your ban (once, this round)</div>
          <p className="mt-1 text-xs text-muted">
            Privately block one player from the hotseat. If they win the vote, the room must revote.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => send({ type: "set_ban", target: myBan === p.id ? null : p.id })}
                className={`rounded-md border py-2 text-sm ${
                  myBan === p.id ? "border-blood bg-blood/20 text-blood" : "border-border text-text-dim"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FinalVote({ state, send }: { state: GameState; send: (m: object) => void }) {
  const players = (state.players as Roster) ?? [];
  const hasA = state.hasAccomplice as boolean;
  const tokens = (state.myTokens as { M: string | null; A: string | null }) ?? { M: null, A: null };
  const place = (token: "M" | "A", id: string) =>
    send({ type: "place_token", token, target: tokens[token] === id ? null : id });
  return (
    <div>
      <div className="eyebrow text-blood">Final vote — place your tokens</div>
      <p className="mt-1 text-xs text-muted">
        M = murderer{hasA ? ", A = accomplice (must be two different people)" : ""}. Change them until the clock hits zero.
      </p>
      <div className="mt-4 space-y-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
            <span className="flex-1 truncate text-text">{p.name}</span>
            <button
              onClick={() => place("M", p.id)}
              className={`h-9 w-9 rounded-full border font-mono text-sm ${
                tokens.M === p.id ? "border-blood bg-blood text-abyss" : "border-blood-dim text-blood"
              }`}
            >
              M
            </button>
            {hasA && (
              <button
                onClick={() => place("A", p.id)}
                className={`h-9 w-9 rounded-full border font-mono text-sm ${
                  tokens.A === p.id ? "border-brass bg-brass text-abyss" : "border-brass-dim text-brass"
                }`}
              >
                A
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmergencyBallot({ state, send }: { state: GameState; send: (m: object) => void }) {
  const players = (state.players as Roster) ?? [];
  const emergency = state.emergency as { myVote?: string };
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-blood bg-deep/95 p-4 backdrop-blur">
      <div className="eyebrow text-blood">Emergency vote · name the killer</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => send({ type: "emergency_vote", target: p.id })}
            className={`rounded-md border py-2 text-sm ${
              emergency.myVote === p.id ? "border-blood bg-blood/20 text-blood" : "border-border text-text"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function RevealView({ state }: { state: GameState }) {
  const result = state.result as { innocents_won: boolean; murderer: string; accomplice: string | null } | undefined;
  const role = (state.sheet as Sheet | undefined)?.role;
  if (!result) return null;
  const youWon = role === "murderer" || role === "accomplice" ? !result.innocents_won : result.innocents_won;
  return (
    <div className="py-12 text-center">
      <div className={`display text-4xl ${youWon ? "text-cyan" : "text-blood"}`}>
        {youWon ? "You win" : "You lose"}
      </div>
      <p className="mt-6 text-text-dim">
        The murderer was <span className="text-blood">{result.murderer}</span>.
      </p>
      {result.accomplice && (
        <p className="text-text-dim">
          Accomplice: <span className="text-blood">{result.accomplice}</span>.
        </p>
      )}
    </div>
  );
}

function SheetOverlay({ sheet, onClose }: { sheet: Sheet; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-abyss/95 p-6 backdrop-blur">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl text-text">{sheet.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">{sheet.archetype}</div>
          </div>
          <button onClick={onClose} className="rounded border border-border px-3 py-1.5 text-sm text-muted">
            Close
          </button>
        </div>
        <SheetBody sheet={sheet} />
      </div>
    </div>
  );
}

function ErrorNote({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <button
      onClick={onDismiss}
      className="mt-4 w-full rounded-md border border-blood-dim bg-blood/10 px-4 py-3 text-left text-sm text-blood"
    >
      {error} <span className="float-right opacity-60">dismiss</span>
    </button>
  );
}

function Center({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center overflow-hidden px-5 py-8">
      <Atmosphere intensity={1} />
      <div className={`relative z-10 flex w-full flex-1 flex-col ${wide ? "max-w-md" : "max-w-sm justify-center"}`}>
        {children}
      </div>
    </main>
  );
}
