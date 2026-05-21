import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

// A player casts (or changes) their accusation ballot for the open vote round.
export async function POST(request: Request) {
  const character = await getCurrentCharacter();
  if (!character) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (character.isGameMaster) {
    return NextResponse.json({ error: "The game master doesn't vote." }, { status: 403 });
  }

  const round = character.game.activeVoteRound;
  if (!round) {
    return NextResponse.json({ error: "Voting isn't open right now." }, { status: 409 });
  }

  let body: { accusedName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.accusedName !== "string" || body.accusedName.trim() === "") {
    return NextResponse.json({ error: "Pick a name." }, { status: 400 });
  }

  await prisma.vote.upsert({
    where: {
      gameId_round_voterId: {
        gameId: character.gameId,
        round,
        voterId: character.id,
      },
    },
    create: {
      gameId: character.gameId,
      round,
      voterId: character.id,
      accusedName: body.accusedName.trim(),
    },
    update: { accusedName: body.accusedName.trim() },
  });

  return NextResponse.json({ ok: true });
}
