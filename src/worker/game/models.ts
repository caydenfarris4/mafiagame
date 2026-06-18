// Shared types passed between the generation engine and the live game.
// (Ported from the Python `models.py` — same shapes, camelCased for TS.)

export type Role = "murderer" | "accomplice" | "innocent";

// GDD section 11 clue types. All clues are true.
//  - noise:    sounds relevant, leads nowhere.
//  - redirect: true info that points at an innocent player.
//  - thread:   subtly implicates the murderer; only damning in combination.
export type ClueType = "noise" | "redirect" | "thread";

// One entry in the designated-character bank.
export interface Character {
  key: string;
  nameMale: string;
  nameFemale: string;
  archetype: string;
  background: string;
  personality: string;
  relationshipWithRichard: string;
  alibi: string;
  secret: string;
  /** 0..1 — how forthcoming the character is when read aloud. */
  candor: number;
}

export interface DeathLocation {
  key: string;
  name: string;
}

export interface TimeOfDeath {
  key: string;
  name: string;
  window: string;
}

// A character + role handed to one player for one game.
export interface Assignment {
  playerId: string;
  character: Character;
  gender: "male" | "female";
  role: Role;
  displayName: string;
}

// One clue placed into a round, already typed and scenario-fitted.
export interface GeneratedClue {
  id: string;
  type: ClueType;
  text: string;
  roundNumber: number;
  isPlaceholder: boolean;
}

// The three clues for one round, plus this round's tamper state.
export interface RoundContent {
  roundNumber: number;
  clues: GeneratedClue[];
  tampered: boolean;
  replacedOut?: GeneratedClue;
  replacedIn?: GeneratedClue;
}

// Everything the RNG engine generates for a single game.
export interface GameContent {
  seed: string;
  location: DeathLocation;
  time: TimeOfDeath;
  mingleMinutes: number;
  assignments: Assignment[];
  rounds: RoundContent[];
  murdererId: string;
  accompliceId: string | null;
}

// A connected player (lobby handle + the seat they hold).
export interface Player {
  id: string;
  name: string;
  gender: "male" | "female";
  connected: boolean;
}
