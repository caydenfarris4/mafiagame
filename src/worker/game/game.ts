// The live game state machine for one room. (Ported from Python `game.py`.)
//
// Implements the GDD flow: Lobby → Narrator opens → Character sheets →
// Introductions → Rules → 3× (Clue drop → Mingle → Hotseat vote →
// Interrogation) → Final vote → Reveal. Murderer tools (Round 2 tamper,
// Round 3 ban) and the Emergency Vote live here too.
//
// Transport-agnostic: it mutates state and produces narrator beats but never
// touches sockets. The Durable Object serialises and broadcasts it. Timed
// stages expose an absolute `stageEndsAt` (ms epoch); the TV counts down
// locally and nudges `advance()` at zero.

import { GameEngine } from "./engine";
import * as narrator from "./narrator";
import type { GameContent, Player, Role } from "./models";

export const STAGE_LOBBY = "lobby";
export const STAGE_OPENING = "opening";
export const STAGE_SHEETS = "sheets";
export const STAGE_INTRODUCTIONS = "introductions";
export const STAGE_RULES = "rules";
export const STAGE_CLUE_DROP = "clue_drop";
export const STAGE_MINGLE = "mingle";
export const STAGE_HOTSEAT_VOTE = "hotseat_vote";
export const STAGE_INTERROGATION = "interrogation";
export const STAGE_FINAL_VOTE = "final_vote";
export const STAGE_REVEAL = "reveal";

const INTERROGATION_SECONDS = 90; // GDD: 1.5 min (R1/R2)
const INTERROGATION_SECONDS_R3 = 180; // GDD section 6: Round 3 is a 3-minute floor
const FINAL_VOTE_SECONDS = 60; // GDD section 8
const EMERGENCY_VOTE_SECONDS = 30; // GDD section 7

export interface GameResult {
  innocentsWon: boolean;
  murderer: string;
  accomplice: string | null;
}

/**
 * Return the uniquely top-voted target, or null on a tie / no votes.
 * The GDD's "majority vote" resolves, in a multi-candidate party vote, as a
 * plurality with a unique leader (a tie at the top yields null).
 */
export function majorityWinner(votes: Record<string, string>): string | null {
  const tally = new Map<string, number>();
  for (const target of Object.values(votes)) tally.set(target, (tally.get(target) ?? 0) + 1);
  if (tally.size === 0) return null;
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 1) return sorted[0][0];
  return sorted[0][1] > sorted[1][1] ? sorted[0][0] : null;
}

export class Game {
  private engine: GameEngine;
  private usedKeys: Set<string>;

  stage = STAGE_LOBBY;
  roundNumber = 0;
  content: GameContent | null = null;

  introIndex = 0;
  clueRevealIndex = 0;
  stageEndsAt: number | null = null; // ms epoch for timed stages
  narrationSeq = 0;
  private _narration: string[] = [];

  // Voting state.
  hotseatVotes: Record<string, string> = {};
  hotseatTarget: string | null = null;
  bannedPlayerId: string | null = null;
  banUsed = false;

  // Final vote: voterId -> { M, A }.
  finalTokens: Record<string, { M: string | null; A: string | null }> = {};

  // Emergency vote (once per game).
  emergencyUsed = false;
  emergencyActive = false;
  emergencyFlags: Record<string, string> = {};
  emergencyVotes: Record<string, string> = {};
  lastResult: GameResult | null = null;

  constructor(engine: GameEngine, usedCharacterKeys: Set<string> = new Set()) {
    this.engine = engine;
    this.usedKeys = usedCharacterKeys;
  }

  get narration(): string[] {
    return this._narration;
  }
  // Setting narration bumps a sequence so the TV speaks each new line exactly
  // once, even though state rebroadcasts on every action.
  setNarration(beats: string[]): void {
    this._narration = beats;
    this.narrationSeq++;
  }

  // -- lifecycle ------------------------------------------------------------
  start(players: Player[]): void {
    const ids = players.map((p) => p.id);
    const genders: Record<string, "male" | "female"> = {};
    for (const p of players) genders[p.id] = p.gender;
    this.content = this.engine.generate(ids, genders, this.usedKeys);
    this.roundNumber = 0;
    this.stage = STAGE_OPENING;
    this.setNarration(
      narrator.opening(this.content.accompliceId !== null, this.content.location, this.content.time),
    );
  }

  characterKeysUsed(): Set<string> {
    if (!this.content) return new Set();
    return new Set(this.content.assignments.map((a) => a.character.key));
  }

  // -- host-driven advancement ---------------------------------------------
  advance(): void {
    switch (this.stage) {
      case STAGE_OPENING:
        return this.enterSheets();
      case STAGE_SHEETS:
        return this.enterIntroductions();
      case STAGE_INTRODUCTIONS:
        return this.advanceIntroductions();
      case STAGE_RULES:
        return this.enterRound(1);
      case STAGE_CLUE_DROP:
        return this.advanceClueDrop();
      case STAGE_MINGLE:
        return this.enterHotseatVote();
      case STAGE_HOTSEAT_VOTE:
        return this.resolveHotseat();
      case STAGE_INTERROGATION:
        return this.afterInterrogation();
      case STAGE_FINAL_VOTE:
        return this.resolveFinalVote();
    }
  }

  // -- stage transitions ----------------------------------------------------
  private enterSheets(): void {
    this.stage = STAGE_SHEETS;
    this.setNarration([]); // players read privately; nothing spoken
  }

  private enterIntroductions(): void {
    this.stage = STAGE_INTRODUCTIONS;
    this.introIndex = 0;
    this.setNarration(["Introductions. Read yours aloud, exactly as it appears."]);
  }

  private advanceIntroductions(): void {
    this.introIndex++;
    if (this.content && this.introIndex >= this.content.assignments.length) this.enterRules();
    else this.setNarration([]);
  }

  private enterRules(): void {
    this.stage = STAGE_RULES;
    this.setNarration(narrator.rulesExplainer(this.content?.mingleMinutes ?? 3));
  }

  private enterRound(n: number): void {
    this.roundNumber = n;
    this.enterClueDrop();
  }

  private enterClueDrop(): void {
    this.stage = STAGE_CLUE_DROP;
    this.clueRevealIndex = 0;
    this.setNarration(narrator.clueDropIntro(this.roundNumber, this.currentRound().tampered));
  }

  private advanceClueDrop(): void {
    const rnd = this.currentRound();
    if (this.clueRevealIndex < rnd.clues.length) {
      this.setNarration(narrator.clueReveal(this.clueRevealIndex, rnd.clues[this.clueRevealIndex].text));
      this.clueRevealIndex++;
    } else {
      this.enterMingle();
    }
  }

  private enterMingle(): void {
    this.stage = STAGE_MINGLE;
    this.emergencyFlags = {};
    this.stageEndsAt = Date.now() + (this.content?.mingleMinutes ?? 3) * 60_000;
    this.setNarration(["Mingle. Move, talk, and make your case. The clock is running."]);
  }

  private enterHotseatVote(): void {
    this.stage = STAGE_HOTSEAT_VOTE;
    this.stageEndsAt = null;
    this.hotseatVotes = {};
    this.bannedPlayerId = null;
    this.setNarration(["Time. On your phones — who takes the hotseat?"]);
  }

  private resolveHotseat(): void {
    const winner = majorityWinner(this.hotseatVotes);

    // GDD section 6 — Round 3 murderer ban resolves against the would-be target.
    if (this.roundNumber === 3 && this.bannedPlayerId && !this.banUsed) {
      if (winner === this.bannedPlayerId) {
        this.banUsed = true;
        this.setNarration(narrator.banBlocked(this.playerPersona(winner)));
        this.hotseatVotes = {};
        this.stage = STAGE_HOTSEAT_VOTE;
        return;
      } else if (winner !== null) {
        this.banUsed = true;
        this.setNarration(narrator.banWasted(this.playerPersona(this.bannedPlayerId), this.playerPersona(winner)));
      }
    }

    this.hotseatTarget = winner;
    if (winner === null) {
      this.setNarration(narrator.hotseatResult(null));
      this.afterInterrogation();
      return;
    }
    if (this._narration.length === 0) this.setNarration(narrator.hotseatResult(this.playerPersona(winner)));
    this.enterInterrogation();
  }

  private enterInterrogation(): void {
    this.stage = STAGE_INTERROGATION;
    const seconds = this.roundNumber === 3 ? INTERROGATION_SECONDS_R3 : INTERROGATION_SECONDS;
    this.stageEndsAt = Date.now() + seconds * 1000;
  }

  private afterInterrogation(): void {
    this.stageEndsAt = null;
    if (this.roundNumber < 3) this.enterRound(this.roundNumber + 1);
    else this.enterFinalVote();
  }

  private enterFinalVote(): void {
    this.stage = STAGE_FINAL_VOTE;
    this.finalTokens = {};
    this.stageEndsAt = Date.now() + FINAL_VOTE_SECONDS * 1000;
    this.setNarration(narrator.finalVoteOpen());
  }

  private resolveFinalVote(): void {
    this.stageEndsAt = null;
    this.enterReveal(this.evaluateFinal());
  }

  private enterReveal(innocentsWon: boolean): void {
    this.stage = STAGE_REVEAL;
    const c = this.content!;
    const murderer = this.playerPersona(c.murdererId);
    const accomplice = c.accompliceId ? this.playerPersona(c.accompliceId) : null;
    this.setNarration(narrator.reveal(murderer, accomplice, innocentsWon));
    this.lastResult = { innocentsWon, murderer, accomplice };
  }

  // -- voting actions -------------------------------------------------------
  castHotseatVote(voterId: string, targetId: string): void {
    if (this.stage !== STAGE_HOTSEAT_VOTE) return;
    if (this.bannedPlayerId && targetId === this.bannedPlayerId) return;
    this.hotseatVotes[voterId] = targetId;
  }

  setBan(voterId: string, targetId: string | null): void {
    if (this.roundNumber !== 3 || this.banUsed) return;
    if (!this.content || voterId !== this.content.murdererId) return;
    this.bannedPlayerId = targetId;
  }

  placeToken(voterId: string, token: "M" | "A", targetId: string | null): void {
    if (this.stage !== STAGE_FINAL_VOTE || (token !== "M" && token !== "A")) return;
    if (token === "A" && !this.gameHasAccomplice()) return;
    const slot = (this.finalTokens[voterId] ??= { M: null, A: null });
    const other = token === "M" ? "A" : "M";
    if (targetId !== null && slot[other] === targetId) return; // tokens must differ
    slot[token] = targetId;
  }

  // -- emergency vote (section 7) ------------------------------------------
  flagEmergency(voterId: string, targetId: string | null): void {
    if (this.stage !== STAGE_MINGLE || this.emergencyUsed || this.emergencyActive) return;
    if (this.roleOf(voterId) !== "innocent") return;
    if (targetId === null) {
      delete this.emergencyFlags[voterId];
      return;
    }
    this.emergencyFlags[voterId] = targetId;
    this.maybeTriggerEmergency();
  }

  private maybeTriggerEmergency(): void {
    const innocents = this.playerIds().filter((p) => this.roleOf(p) === "innocent");
    if (innocents.length === 0) return;
    if (innocents.every((p) => this.emergencyFlags[p])) {
      const targets = new Set(innocents.map((p) => this.emergencyFlags[p]));
      if (targets.size === 1) this.openEmergencyVote();
    }
  }

  private openEmergencyVote(): void {
    this.emergencyActive = true;
    this.emergencyVotes = {};
    this.stageEndsAt = Date.now() + EMERGENCY_VOTE_SECONDS * 1000;
    this.setNarration(["An emergency vote has been called!", "Thirty seconds. If you are certain, name the killer now."]);
  }

  castEmergencyVote(voterId: string, targetId: string): void {
    if (!this.emergencyActive) return;
    this.emergencyVotes[voterId] = targetId;
    if (Object.keys(this.emergencyVotes).length >= this.playerIds().length) this.resolveEmergencyVote();
  }

  resolveEmergencyVote(): void {
    if (!this.emergencyActive || !this.content) return;
    this.emergencyActive = false;
    this.emergencyUsed = true;
    this.stageEndsAt = null;
    const innocents = this.playerIds().filter((p) => this.roleOf(p) === "innocent");
    const unanimousCorrect =
      innocents.length > 0 && innocents.every((p) => this.emergencyVotes[p] === this.content!.murdererId);
    if (unanimousCorrect) {
      this.enterReveal(true);
    } else {
      this.setNarration(["Not unanimous. The emergency vote is spent. We continue."]);
      this.stage = STAGE_MINGLE;
      this.emergencyFlags = {};
      this.stageEndsAt = Date.now() + 30_000;
    }
  }

  // -- resolution -----------------------------------------------------------
  private evaluateFinal(): boolean {
    const c = this.content!;
    const mVotes: Record<string, string> = {};
    const aVotes: Record<string, string> = {};
    for (const [voter, t] of Object.entries(this.finalTokens)) {
      if (t.M) mVotes[voter] = t.M;
      if (t.A) aVotes[voter] = t.A;
    }
    if (majorityWinner(mVotes) !== c.murdererId) return false;
    if (this.gameHasAccomplice() && majorityWinner(aVotes) !== c.accompliceId) return false;
    return true;
  }

  // -- helpers --------------------------------------------------------------
  currentRound() {
    return this.content!.rounds[this.roundNumber - 1];
  }
  playerIds(): string[] {
    return this.content ? this.content.assignments.map((a) => a.playerId) : [];
  }
  roleOf(playerId: string): Role {
    return this.content?.assignments.find((a) => a.playerId === playerId)?.role ?? "innocent";
  }
  playerPersona(playerId: string | null): string {
    if (!playerId || !this.content) return "no one";
    return this.content.assignments.find((a) => a.playerId === playerId)?.displayName ?? "no one";
  }
  gameHasAccomplice(): boolean {
    return !!(this.content && this.content.accompliceId);
  }
}
