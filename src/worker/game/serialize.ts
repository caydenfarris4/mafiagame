// Build the per-viewer state payloads broadcast over the socket.
// (Ported from Python `serialize.py`.)
//
// Two audiences: the shared TV (`tvState`) and an individual phone
// (`playerState`). This split is the trust boundary — private character sheets
// and true roles only ever go to the one phone they belong to. Hotseat votes
// stay hidden (section 6); only the final vote is public (section 8).

import {
  Game,
  STAGE_FINAL_VOTE,
  STAGE_INTRODUCTIONS,
  STAGE_LOBBY,
  STAGE_REVEAL,
} from "./game";
import { VICTIM } from "./narrator";
import type { Assignment, Player } from "./models";

export interface RoomContext {
  code: string;
  hostId: string | null;
  game: Game;
  players: Map<string, Player>;
  sittingScores: Record<string, number>;
  gameNumber: number;
}

function personasPublic(game: Game): boolean {
  // Persona names become public once introductions begin (section 4).
  return ![STAGE_LOBBY, "opening", "sheets"].includes(game.stage);
}

interface RosterEntry {
  id: string;
  name: string;
  connected: boolean;
  archetype?: string;
}

function roster(ctx: RoomContext): RosterEntry[] {
  const game = ctx.game;
  const isPublic = personasPublic(game);
  const out: RosterEntry[] = [];
  for (const [pid, p] of ctx.players) {
    const assignment = game.content?.assignments.find((a) => a.playerId === pid);
    if (isPublic && assignment) {
      out.push({ id: pid, connected: p.connected, name: assignment.displayName, archetype: assignment.character.archetype });
    } else {
      out.push({ id: pid, connected: p.connected, name: p.name });
    }
  }
  return out;
}

export function tvState(ctx: RoomContext): Record<string, unknown> {
  const game = ctx.game;
  const base: Record<string, unknown> = {
    view: "tv",
    roomCode: ctx.code,
    stage: game.stage,
    roundNumber: game.roundNumber,
    narration: game.narration,
    narrationSeq: game.narrationSeq,
    endsAt: game.stageEndsAt,
    players: roster(ctx),
    playerCount: ctx.players.size,
    sittingScores: ctx.sittingScores,
    gameNumber: ctx.gameNumber,
  };

  if (game.content) {
    base.scenario = {
      location: game.content.location.name,
      time: game.content.time.name,
      timeWindow: game.content.time.window,
    };
  }

  if (game.stage === STAGE_INTRODUCTIONS && game.content) {
    base.introduction = introduction(game.content.assignments[game.introIndex]);
    base.introIndex = game.introIndex;
    base.introTotal = game.content.assignments.length;
  }

  if (["clue_drop", "mingle", "hotseat_vote", "interrogation"].includes(game.stage) && game.content) {
    const rnd = game.content.rounds[game.roundNumber - 1];
    const revealed = game.stage === "clue_drop" ? rnd.clues.slice(0, game.clueRevealIndex) : rnd.clues;
    base.clues = revealed.map((c) => ({ text: c.text, placeholder: c.isPlaceholder }));
    base.tampered = rnd.tampered;
  }

  if (game.stage === "hotseat_vote") {
    base.votesIn = Object.keys(game.hotseatVotes).length; // count only (section 6)
    base.hotseatTarget = game.hotseatTarget;
  }
  if (game.stage === "interrogation") base.hotseatName = game.playerPersona(game.hotseatTarget);

  if (game.emergencyActive) {
    base.emergency = { active: true, votesIn: Object.keys(game.emergencyVotes).length };
  }

  if (game.stage === STAGE_FINAL_VOTE && game.content) {
    base.board = finalBoard(game);
    base.hasAccomplice = game.gameHasAccomplice();
  }

  if (game.stage === STAGE_REVEAL) base.result = game.lastResult;

  return base;
}

export function playerState(ctx: RoomContext, playerId: string): Record<string, unknown> {
  const game = ctx.game;
  const p = ctx.players.get(playerId);
  const base: Record<string, unknown> = {
    view: "player",
    roomCode: ctx.code,
    stage: game.stage,
    roundNumber: game.roundNumber,
    playerId,
    name: p?.name ?? "Player",
    endsAt: game.stageEndsAt,
    isHost: playerId === ctx.hostId,
  };
  if (!game.content) {
    base.players = roster(ctx);
    return base;
  }

  const assignment = game.content.assignments.find((a) => a.playerId === playerId);
  if (assignment) {
    base.sheet = sheet(game, assignment);
    base.role = assignment.role;
  }

  base.players = roster(ctx).filter((r) => r.id !== playerId);

  if (game.stage === "hotseat_vote") {
    base.myVote = game.hotseatVotes[playerId] ?? null;
    base.bannedId = game.bannedPlayerId;
    if (game.roundNumber === 3 && assignment?.role === "murderer") {
      base.canBan = !game.banUsed;
      base.myBan = game.bannedPlayerId;
    }
  }

  if (game.stage === "mingle" && assignment && assignment.role === "innocent") {
    base.emergencyAvailable = !game.emergencyUsed && !game.emergencyActive;
    base.myEmergencyFlag = game.emergencyFlags[playerId] ?? null;
  }

  if (game.emergencyActive) {
    base.emergency = { active: true, myVote: game.emergencyVotes[playerId] ?? null };
  }

  if (game.stage === STAGE_FINAL_VOTE) {
    base.hasAccomplice = game.gameHasAccomplice();
    base.myTokens = game.finalTokens[playerId] ?? { M: null, A: null };
    base.board = finalBoard(game);
  }

  if (game.stage === STAGE_REVEAL) base.result = game.lastResult;

  return base;
}

// -- builders ---------------------------------------------------------------
function introduction(a: Assignment) {
  const c = a.character;
  return {
    name: a.displayName,
    archetype: c.archetype,
    background: c.background,
    personality: c.personality,
    relationship: c.relationshipWithRichard,
    alibi: c.alibi,
  };
}

function sheet(game: Game, a: Assignment) {
  const c = a.character;
  const s: Record<string, unknown> = {
    name: a.displayName,
    archetype: c.archetype,
    background: c.background,
    personality: c.personality,
    relationship: c.relationshipWithRichard,
    alibi: c.alibi,
    secret: c.secret,
    role: a.role,
  };
  const content = game.content;
  if (a.role === "murderer" && content) {
    s.theTruth = `You killed ${VICTIM}. The clues all point your way — deflect, redirect, and survive the vote.`;
    if (content.accompliceId) s.conspirator = game.playerPersona(content.accompliceId);
  }
  if (a.role === "accomplice" && content) {
    s.conspirator = game.playerPersona(content.murdererId);
    s.theTruth =
      "You helped cover it up. No clue points at you — your only tell is how you behave. Read the room and protect your partner.";
  }
  return s;
}

function finalBoard(game: Game) {
  const mCounts: Record<string, number> = {};
  const aCounts: Record<string, number> = {};
  for (const tokens of Object.values(game.finalTokens)) {
    if (tokens.M) mCounts[tokens.M] = (mCounts[tokens.M] ?? 0) + 1;
    if (tokens.A) aCounts[tokens.A] = (aCounts[tokens.A] ?? 0) + 1;
  }
  return game.content!.assignments.map((a) => ({
    id: a.playerId,
    name: a.displayName,
    M: mCounts[a.playerId] ?? 0,
    A: aCounts[a.playerId] ?? 0,
  }));
}
