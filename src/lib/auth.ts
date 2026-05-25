import "server-only";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** Returns the logged-in character (with its game), or null if not signed in. */
export async function getCurrentCharacter() {
  const session = await getSession();
  if (!session.characterId) return null;

  const prisma = await getDb();
  const character = await prisma.character.findUnique({
    where: { id: session.characterId },
    include: { game: true },
  });

  // Session points at a character that no longer exists — treat as logged out.
  return character ?? null;
}

export type AccessStatus = "NONE" | "PENDING" | "APPROVED" | "BLOCKED";

/**
 * Resolves the signed-in character together with whether the game master has
 * approved this device. The host (game master) always passes; every other
 * device must have an APPROVED PlayerSession. Also bumps the session's
 * last-seen so the GM's roster shows who's currently online.
 */
export async function getAccess() {
  const session = await getSession();
  if (!session.characterId) {
    return { character: null, status: "NONE" as AccessStatus };
  }

  const prisma = await getDb();
  const character = await prisma.character.findUnique({
    where: { id: session.characterId },
    include: { game: true },
  });
  if (!character) {
    return { character: null, status: "NONE" as AccessStatus };
  }

  // The host runs the gate, so they're trusted without a tracked session.
  if (character.isGameMaster) {
    return { character, status: "APPROVED" as AccessStatus };
  }

  const sessionRow = session.sessionId
    ? await prisma.playerSession.findUnique({ where: { id: session.sessionId } })
    : null;

  // No tracked session (e.g. a stale cookie from before tracking) → make them
  // re-queue for approval rather than silently granting access.
  if (!sessionRow || sessionRow.characterId !== character.id) {
    return { character, status: "PENDING" as AccessStatus };
  }

  if (sessionRow.status === "BLOCKED") {
    return { character, status: "BLOCKED" as AccessStatus };
  }

  // Any authenticated activity counts as a heartbeat for the online roster.
  // Players poll every few seconds, but the roster only needs freshness within
  // its 30s online window, so skip the write when we refreshed recently. This
  // cuts D1 writes on the hottest path; staleness stays well inside the window.
  if (Date.now() - sessionRow.lastSeenAt.getTime() >= 20_000) {
    await prisma.playerSession.update({
      where: { id: sessionRow.id },
      data: { lastSeenAt: new Date() },
    });
  }

  const status: AccessStatus =
    sessionRow.status === "APPROVED" ? "APPROVED" : "PENDING";
  return { character, status };
}

/**
 * Guard for player-only API routes: returns the approved character, or a ready
 * `error` response (401 if not signed in, 403 if still pending / blocked).
 */
export async function requireApprovedPlayer() {
  const access = await getAccess();
  if (access.status === "NONE" || !access.character) {
    return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }), character: null };
  }
  if (access.character.isGameMaster) {
    return { error: NextResponse.json({ error: "The game master doesn't play." }, { status: 403 }), character: null };
  }
  if (access.status !== "APPROVED") {
    return {
      error: NextResponse.json(
        {
          error:
            access.status === "BLOCKED"
              ? "Your access was removed by the game master."
              : "Waiting for the game master to let you in.",
          pending: access.status === "PENDING",
          blocked: access.status === "BLOCKED",
        },
        { status: 403 },
      ),
      character: null,
    };
  }
  return { error: null, character: access.character };
}

/** Normalizes a login code: trims and uppercases so codes are case-insensitive. */
export function normalizeCode(raw: string) {
  return raw.trim().toUpperCase();
}
