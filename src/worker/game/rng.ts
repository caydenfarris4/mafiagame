// Deterministic random-generation engine (ported from Python `rng.py`).
//
// Per the GDD, every scenario, role and clue pull comes from a seedable PRNG —
// no AI / API token, ever. Seeding makes a whole game reproducible (and unit-
// testable), and lets a game be replayed from its short seed token.
//
// We use `mulberry32`: a tiny, fast, well-distributed 32-bit PRNG. Combined with
// a stable string->int hash (FNV-1a), the same seed token always yields the same
// stream regardless of host or run.

// Unambiguous alphabet: no 0/O, 1/I/L — easy to read/type as a room code.
const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SEED_TOKEN_ALPHABET = ROOM_CODE_ALPHABET;

/** A seedable random source for one game. */
export class GameRNG {
  readonly seed: string;
  private next: () => number; // returns a float in [0, 1)

  constructor(seed?: string) {
    this.seed = seed ?? makeSeedToken();
    this.next = mulberry32(fnv1a(this.seed));
  }

  /** Pick one item. Throws on an empty array (callers guard the banks). */
  choice<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("cannot choose from an empty array");
    return items[Math.floor(this.next() * items.length)];
  }

  /** Pick `k` distinct items (partial Fisher–Yates over a copy). */
  sample<T>(items: readonly T[], k: number): T[] {
    if (k > items.length) throw new Error(`cannot sample ${k} from ${items.length}`);
    const pool = [...items];
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(this.next() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, k);
  }

  /** Return a new shuffled array; never mutates the input. */
  shuffled<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** Inclusive integer in [low, high]. */
  randint(low: number, high: number): number {
    return low + Math.floor(this.next() * (high - low + 1));
  }

  /**
   * The GDD's "intelligently loop through and choose the variation": a clue
   * scenario may map to many hand-written variations; this draws one. Named for
   * intent at call sites and so it can grow smarter later without touching them.
   */
  pickVariation<T>(options: readonly T[]): T {
    return this.choice(options);
  }

  /** A fresh 4-character room code from the unambiguous alphabet. */
  roomCode(): string {
    let code = "";
    for (let i = 0; i < 4; i++) code += ROOM_CODE_ALPHABET[Math.floor(this.next() * ROOM_CODE_ALPHABET.length)];
    return code;
  }
}

/**
 * Generate a fresh, human-readable seed token using the platform CSPRNG. The
 * token fully determines a `GameRNG` stream, so persisting it replays a game.
 */
export function makeSeedToken(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += SEED_TOKEN_ALPHABET[b % SEED_TOKEN_ALPHABET.length];
  return out;
}

/** A stable 32-bit FNV-1a hash of `text` (deterministic across runs/hosts). */
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    // h *= 16777619, kept in 32-bit space.
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG: seed -> function returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
