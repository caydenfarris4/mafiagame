import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

// Resets the game for a fresh playthrough: clears every clue discovery, vote,
// and live announcement; un-sends all scripted reveals; and returns the game to
// Phase 0. Keeps the cast, the clue definitions, and admitted player devices so
// the same group can play again without re-signing-in.
export async function POST() {
  const gm = await getCurrentCharacter();
  if (!gm || !gm.isGameMaster) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const gameId = gm.gameId;
  const prisma = await getDb();

  await prisma.clueDiscovery.deleteMany({ where: { clue: { gameId } } });
  await prisma.vote.deleteMany({ where: { gameId } });
  // Remove the live entries created during play (found ANNOUNCE / shared KEEP clues).
  await prisma.announcement.deleteMany({ where: { gameId, isScripted: false } });
  // Re-arm the scripted reveal library so none of them show in the feed.
  await prisma.announcement.updateMany({
    where: { gameId, isScripted: true },
    data: { isReleased: false, releasedAt: null },
  });
  await prisma.game.update({
    where: { id: gameId },
    data: { currentPhase: 0, status: "SETUP", activeVoteRound: null },
  });

  return NextResponse.json({ ok: true });
}
