import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

export async function GET() {
  const gm = await getCurrentCharacter();
  if (!gm || !gm.isGameMaster) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [discoveries, clues, characters] = await Promise.all([
    prisma.clueDiscovery.findMany({
      where: { clue: { gameId: gm.gameId } },
      orderBy: { foundAt: "desc" },
      include: {
        character: { select: { id: true, name: true, realName: true, avatarColor: true } },
        clue: { select: { id: true, title: true, visibility: true, location: true } },
      },
      take: 200,
    }),
    prisma.clue.findMany({
      where: { gameId: gm.gameId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { discoveries: true } } },
    }),
    prisma.character.findMany({
      where: { gameId: gm.gameId, isGameMaster: false },
      orderBy: { name: "asc" },
      include: { _count: { select: { discoveries: true } } },
    }),
  ]);

  return NextResponse.json({ discoveries, clues, characters });
}
