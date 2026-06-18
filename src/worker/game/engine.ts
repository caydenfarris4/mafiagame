// The generation engine — turns a player list into a full game's content.
// (Ported from Python `engine.py`.)
//
// Pure, seedable, no API: assigns roles, rotates characters with cross-game
// memory, rolls a scenario, and pulls a balanced 9-clue set. When the banks
// can't satisfy a draw it substitutes labelled "[PLACEHOLDER]" content so the
// whole game runs before the real cast/clues are authored.

import { CHARACTER_BANK } from "./data/characters";
import { cluesForScenario, SCENARIO_CLUES, type ScenarioClue, type ScenarioClues } from "./data/clues";
import { DEATH_LOCATIONS, TIMES_OF_DEATH } from "./data/scenarios";
import type {
  Assignment,
  Character,
  ClueType,
  GameContent,
  GeneratedClue,
  Role,
  RoundContent,
} from "./models";
import { GameRNG } from "./rng";

// GDD section 6 — mingle timer scales with player count.
export function mingleMinutesFor(numPlayers: number): number {
  if (numPlayers <= 5) return 2;
  if (numPlayers <= 7) return 3;
  if (numPlayers <= 9) return 4;
  return 5;
}

// GDD section 1 — two murderers (an accomplice) at 6+ players.
export function hasAccomplice(numPlayers: number): boolean {
  return numPlayers >= 6;
}

export class GameEngine {
  private characters: Character[];
  private scenarioClues: ScenarioClues[];

  // Banks default to the authored arrays; tests inject fakes.
  constructor(characters: Character[] = CHARACTER_BANK, scenarioClues: ScenarioClues[] = SCENARIO_CLUES) {
    this.characters = characters;
    this.scenarioClues = scenarioClues;
  }

  generate(
    playerIds: string[],
    genders: Record<string, "male" | "female">,
    usedCharacterKeys: Set<string> = new Set(),
    seed?: string,
  ): GameContent {
    if (playerIds.length < 4) throw new Error("Dead in the Water needs at least 4 players");
    const rng = new GameRNG(seed);

    const location = rng.choice(DEATH_LOCATIONS);
    const time = rng.choice(TIMES_OF_DEATH);

    const cast = this.rotateCharacters(rng, playerIds.length, usedCharacterKeys);
    const roles = this.assignRoles(rng, playerIds);

    const assignments: Assignment[] = playerIds.map((pid, i) => {
      const gender = genders[pid] ?? "male";
      const character = cast[i];
      return {
        playerId: pid,
        character,
        gender,
        role: roles[pid],
        displayName: gender === "female" ? character.nameFemale : character.nameMale,
      };
    });

    const murdererId = playerIds.find((pid) => roles[pid] === "murderer")!;
    const accompliceId = playerIds.find((pid) => roles[pid] === "accomplice") ?? null;
    // Clues point at people by name, assigned now: threads at the murderer,
    // redirects/noise at innocents. (Clues aren't tied to characters, so the
    // same clue can implicate whoever it's handed to this game.)
    const murdererName = assignments.find((a) => a.playerId === murdererId)!.displayName;
    const innocentNames = assignments.filter((a) => a.role === "innocent").map((a) => a.displayName);

    const rounds = this.buildRounds(rng, location.key, time.key, murdererName, innocentNames);

    return {
      seed: rng.seed,
      location,
      time,
      mingleMinutes: mingleMinutesFor(playerIds.length),
      assignments,
      rounds,
      murdererId,
      accompliceId,
    };
  }

  // -- role assignment ------------------------------------------------------
  private assignRoles(rng: GameRNG, playerIds: string[]): Record<string, Role> {
    const roles: Record<string, Role> = {};
    for (const pid of playerIds) roles[pid] = "innocent";
    const guilty = rng.sample(playerIds, hasAccomplice(playerIds.length) ? 2 : 1);
    roles[guilty[0]] = "murderer";
    if (guilty.length > 1) roles[guilty[1]] = "accomplice";
    return roles;
  }

  // -- character rotation (cross-game memory) -------------------------------
  private rotateCharacters(rng: GameRNG, count: number, used: Set<string>): Character[] {
    if (this.characters.length === 0) {
      return Array.from({ length: count }, (_, i) => placeholderCharacter(i));
    }
    const fresh = this.characters.filter((c) => !used.has(c.key));
    const stale = this.characters.filter((c) => used.has(c.key));
    let chosen: Character[];

    if (fresh.length >= count) {
      chosen = rng.sample(fresh, count);
    } else {
      chosen = rng.shuffled(fresh);
      let need = count - chosen.length;
      if (need > stale.length) {
        // Bank smaller than the table: reuse characters to fill seats.
        const pool = stale.length ? stale : this.characters;
        while (need > 0) {
          chosen.push(rng.choice(pool));
          need--;
        }
      } else {
        chosen.push(...rng.sample(stale, need));
      }
    }
    return rng.shuffled(chosen);
  }

  // -- clue generation ------------------------------------------------------
  private buildRounds(
    rng: GameRNG,
    locationKey: string,
    timeKey: string,
    murdererName: string,
    innocentNames: string[],
  ): RoundContent[] {
    const pool = cluesForScenario(this.scenarioClues, locationKey, timeKey);
    const byType = (t: ClueType) => pool.filter((c) => c.type === t);

    // Each round is a Noise + Redirect + Thread trio (section 6). We draw a 4th
    // redirect as the spare the Round 2 tamper swaps in for that round's noise.
    const aimAtMurderer = () => murdererName;
    const aimAtInnocent = () => (innocentNames.length ? rng.choice(innocentNames) : "someone");

    const threads = this.take(rng, byType("thread"), 3, "thread", aimAtMurderer);
    const redirects = this.take(rng, byType("redirect"), 4, "redirect", aimAtInnocent);
    const noises = this.take(rng, byType("noise"), 3, "noise", aimAtInnocent);

    const rounds: RoundContent[] = [];
    for (let r = 0; r < 3; r++) {
      const trio = [threads[r], redirects[r], noises[r]].map((c) => renumber(c, r + 1));
      rounds.push({ roundNumber: r + 1, clues: rng.shuffled(trio), tampered: false });
    }

    // GDD section 6: the murderer swaps Round 2's noise clue for an extra
    // redirect — final spread 3 thread / 4 redirect / 2 noise.
    const rnd = rounds[1];
    const noiseClue = rnd.clues.find((c) => c.type === "noise");
    if (noiseClue) {
      const replacement = renumber(redirects[3], 2);
      rnd.clues = rnd.clues.map((c) => (c.id === noiseClue.id ? replacement : c));
      rnd.tampered = true;
      rnd.replacedOut = noiseClue;
      rnd.replacedIn = replacement;
    }
    return rounds;
  }

  // Draw `count` scenario clues of one type, filling each clue's `{name}`
  // placeholder with the character it points at. Falls back to labelled
  // placeholders to guarantee the count when a scenario isn't fully authored.
  private take(
    rng: GameRNG,
    pool: ScenarioClue[],
    count: number,
    clueType: ClueType,
    nameFor: () => string,
  ): GeneratedClue[] {
    const shuffled = rng.shuffled(pool);
    const out: GeneratedClue[] = [];
    for (let i = 0; i < count; i++) {
      if (i < shuffled.length) {
        const text = shuffled[i].text.includes("{name}")
          ? shuffled[i].text.replaceAll("{name}", nameFor())
          : shuffled[i].text;
        out.push({
          id: `${clueType}-${rng.seed}-${i}-${rng.randint(1000, 9999)}`,
          type: clueType,
          text,
          roundNumber: 0,
          isPlaceholder: false,
        });
      } else {
        out.push(placeholderClue(rng, clueType, i, nameFor()));
      }
    }
    return out;
  }
}

// -- placeholders (used only until the banks are authored) ------------------
function placeholderCharacter(index: number): Character {
  const label = `Suspect ${index + 1}`;
  return {
    key: `__placeholder_${index}`,
    nameMale: label,
    nameFemale: label,
    archetype: "[PLACEHOLDER — add characters in data/characters.ts]",
    background: "Placeholder background. Author the character bank to replace this.",
    personality: "Placeholder personality.",
    relationshipWithRichard: "Placeholder relationship with Richard.",
    alibi: "Placeholder alibi for the night.",
    secret: "Placeholder secret.",
    candor: 0.3,
  };
}

function placeholderClue(rng: GameRNG, clueType: ClueType, index: number, name: string): GeneratedClue {
  const text: Record<ClueType, string> = {
    thread: `[PLACEHOLDER thread] Something subtly ties ${name} to the scene.`,
    redirect: `[PLACEHOLDER redirect] A true detail makes ${name} look guilty.`,
    noise: "[PLACEHOLDER noise] An odd detail that ultimately means nothing.",
  };
  return {
    id: `${clueType}-ph-${rng.randint(1000, 9999)}-${index}`,
    type: clueType,
    text: text[clueType],
    roundNumber: 0,
    isPlaceholder: true,
  };
}

function renumber(clue: GeneratedClue, roundNumber: number): GeneratedClue {
  clue.roundNumber = roundNumber;
  return clue;
}
