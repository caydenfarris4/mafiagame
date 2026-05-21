import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const character = await getCurrentCharacter();
  if (!character) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const clue = await prisma.clue.findUnique({ where: { token } });
  if (!clue || clue.gameId !== character.gameId) {
    return NextResponse.json({ error: "Unknown clue." }, { status: 404 });
  }

  const existing = await prisma.clueDiscovery.findUnique({
    where: { clueId_characterId: { clueId: clue.id, characterId: character.id } },
  });

  if (!existing) {
    await prisma.clueDiscovery.create({
      data: { clueId: clue.id, characterId: character.id },
    });
  }

  return NextResponse.json({
    title: clue.title,
    content: clue.content,
    visibility: clue.visibility,
    alreadyFound: Boolean(existing),
  });
}
