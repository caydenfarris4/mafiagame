import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

// GM opens or closes an accusation ballot. round = 4 | 5 to open, null to close.
export async function POST(request: Request) {
  const gm = await getCurrentCharacter();
  if (!gm || !gm.isGameMaster) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { round?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const round = body.round === null ? null : Number(body.round);
  if (round !== null && round !== 4 && round !== 5) {
    return NextResponse.json({ error: "Round must be 4, 5, or null." }, { status: 400 });
  }

  const prisma = await getDb();
  await prisma.game.update({
    where: { id: gm.gameId },
    data: { activeVoteRound: round },
  });

  return NextResponse.json({ ok: true, activeVoteRound: round });
}
