import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** Returns the logged-in character (with its game), or null if not signed in. */
export async function getCurrentCharacter() {
  const session = await getSession();
  if (!session.characterId) return null;

  const character = await prisma.character.findUnique({
    where: { id: session.characterId },
    include: { game: true },
  });

  // Session points at a character that no longer exists — treat as logged out.
  return character ?? null;
}

/** Normalizes a login code: trims and uppercases so codes are case-insensitive. */
export function normalizeCode(raw: string) {
  return raw.trim().toUpperCase();
}
