// The generation engine — turns a player list into a full game's content.
// (Ported from Python `engine.py`.)
//
// Pure, seedable, no API: assigns roles, rotates characters with cross-game
// memory, rolls a scenario, and pulls a balanced 9-clue set. When the banks
// can't satisfy a draw it substitutes labelled "[PLACEHOLDER]" content so the
// whole game runs before the real cast/clues are authored.

import { CHARACTER_BANK } from "./data/characters";
import { CLUE_BANK, clueFits, THREADS_PER_GAME } from "./data/clues";
import { DEATH_LOCATIONS, TIMES_OF_DEATH } from "./data/scenarios";
import type {
  Assignment,
  Character,
  Clue,
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
  private clues: Clue[];

  // Banks default to the (currently empty) authored arrays; tests inject fakes.
  constructor(characters: Character[] = CHARACTER_BANK, clues: Clue[] = CLUE_BANK) {
    this.characters = characters;
    this.clues = clues;
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
    const murdererChar = assignments.find((a) => a.playerId === murdererId)!.character;
    const innocentChars = assignments.filter((a) => a.role === "innocent").map((a) => a.character);

    const rounds = this.buildRounds(rng, location.key, time.key, murdererChar, innocentChars);

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
    murderer: Character,
    innocents: Character[],
  ): RoundContent[] {
    // Each round is a standard Noise + Redirect + Thread trio (section 6).
    const threads = this.pull(rng, "thread", 3, locationKey, timeKey, [murderer]);
    const redirects = this.pull(rng, "redirect", 3, locationKey, timeKey, innocents);
    const noises = this.pull(rng, "noise", 3, locationKey, timeKey, innocents.length ? innocents : [murderer]);

    const rounds: RoundContent[] = [];
    for (let r = 0; r < 3; r++) {
      const trio = [threads[r], redirects[r], noises[r]].map((c) => renumber(c, r + 1));
      rounds.push({ roundNumber: r + 1, clues: rng.shuffled(trio), tampered: false });
    }
    this.applyRound2Tamper(rng, rounds, locationKey, timeKey, innocents);
    return rounds;
  }

  // GDD section 6: murderer swaps Round 2's noise clue for a redirect.
  private applyRound2Tamper(
    rng: GameRNG,
    rounds: RoundContent[],
    locationKey: string,
    timeKey: string,
    innocents: Character[],
  ): void {
    const rnd = rounds[1];
    const noiseClue = rnd.clues.find((c) => c.type === "noise");
    if (!noiseClue) return; // no noise this round; nothing to tamper
    const replacement = renumber(this.pull(rng, "redirect", 1, locationKey, timeKey, innocents)[0], 2);
    rnd.clues = rnd.clues.map((c) => (c.id === noiseClue.id ? replacement : c));
    rnd.tampered = true;
    rnd.replacedOut = noiseClue;
    rnd.replacedIn = replacement;
  }

  // Draw `count` clues of a type that fit the scenario, falling back to
  // labelled placeholders to guarantee the count.
  private pull(
    rng: GameRNG,
    clueType: ClueType,
    count: number,
    locationKey: string,
    timeKey: string,
    owners: Character[] | null,
  ): GeneratedClue[] {
    const ownerKeys = owners ? new Set(owners.map((c) => c.key)) : null;
    const pool = this.clues.filter(
      (c) =>
        c.type === clueType &&
        clueFits(c, locationKey, timeKey) &&
        (ownerKeys === null || ownerKeys.has(c.characterKey)),
    );
    const chosenPool = rng.shuffled(pool);
    const out: GeneratedClue[] = [];
    for (let i = 0; i < count; i++) {
      if (i < chosenPool.length) {
        out.push({
          id: `${clueType}-${rng.seed}-${i}-${rng.randint(1000, 9999)}`,
          type: clueType,
          text: chosenPool[i].text,
          roundNumber: 0,
          isPlaceholder: false,
        });
      } else {
        out.push(placeholderClue(rng, clueType, i, owners));
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

function placeholderClue(rng: GameRNG, clueType: ClueType, index: number, owners: Character[] | null): GeneratedClue {
  const who = owners && owners.length ? owners[0].nameMale : "someone";
  const text: Record<ClueType, string> = {
    thread: "[PLACEHOLDER thread] Something subtly ties the murderer to the scene.",
    redirect: `[PLACEHOLDER redirect] A true detail makes ${who} look guilty.`,
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

export { THREADS_PER_GAME };
