import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";
import { PHASES } from "@/lib/gameContent";

const MAX_PHASE = PHASES[PHASES.length - 1].n;

export async function POST(request: Request) {
  const gm = await getCurrentCharacter();
  if (!gm || !gm.isGameMaster) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { phase?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const phase = Number(body.phase);
  if (!Number.isInteger(phase) || phase < 0 || phase > MAX_PHASE) {
    return NextResponse.json({ error: "Invalid phase." }, { status: 400 });
  }

  const status = phase === 0 ? "SETUP" : phase >= MAX_PHASE ? "ENDED" : "RUNNING";

  // Changing phase always closes any open ballot.
  const prisma = await getDb();
  await prisma.game.update({
    where: { id: gm.gameId },
    data: { currentPhase: phase, status, activeVoteRound: null },
  });

  return NextResponse.json({ ok: true, currentPhase: phase, status });
}
