import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

export async function GET() {
  const character = await getCurrentCharacter();
  if (!character) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const [discoveries, announcements] = await Promise.all([
    // The player's own found clues (and only their own).
    prisma.clueDiscovery.findMany({
      where: { characterId: character.id },
      orderBy: { foundAt: "desc" },
      include: {
        clue: { select: { id: true, title: true, content: true, visibility: true } },
      },
    }),
    // Public clues the GM has released — visible to everyone.
    prisma.clue.findMany({
      where: { gameId: character.gameId, visibility: "PUBLIC", isReleased: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true },
    }),
  ]);

  return NextResponse.json({
    character: {
      name: character.name,
      realName: character.realName,
      role: character.role,
      isAlive: character.isAlive,
      avatarColor: character.avatarColor,
    },
    discoveries,
    announcements,
  });
}
