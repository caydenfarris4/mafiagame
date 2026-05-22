// A short, human-typeable clue code derived deterministically from the clue's
// random token. Used for the QR tags and the scanner's manual-entry fallback so
// players can't simply guess sequential codes ("2-1", "2-2", …). No storage:
// the same token always maps to the same code, on server and client.

// 31 unambiguous chars (no 0/O, 1/I/L) so the printed code is easy to read/type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LEN = 6;

function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 6-char uppercase code for a clue token, e.g. "K7M4QX". */
export function clueEntryCode(token: string): string {
  let out = "";
  for (let i = 0; i < LEN; i++) {
    out += ALPHABET[hash(`${token}:${i}`) % ALPHABET.length];
  }
  return out;
}

/** Normalize user-typed input for comparison against clueEntryCode. */
export function normalizeEntryCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
