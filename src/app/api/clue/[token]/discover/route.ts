import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";
import { getPhase } from "@/lib/gameContent";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const character = await getCurrentCharacter();
  if (!character) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const prisma = await getDb();
  const clue = await prisma.clue.findUnique({ where: { token } });
  if (!clue || clue.gameId !== character.gameId) {
    return NextResponse.json({ error: "Unknown clue." }, { status: 404 });
  }

  // Physically the QR is hidden in a locked room, but enforce the phase gate too.
  if (clue.phase > character.game.currentPhase) {
    const phase = getPhase(clue.phase);
    return NextResponse.json(
      {
        error: `That area isn't open yet. This clue unlocks in Phase ${clue.phase} — ${phase.name}.`,
        locked: true,
      },
      { status: 403 },
    );
  }

  const existing = await prisma.clueDiscovery.findUnique({
    where: { clueId_characterId: { clueId: clue.id, characterId: character.id } },
  });

  if (!existing) {
    await prisma.clueDiscovery.create({
      data: { clueId: clue.id, characterId: character.id },
    });
  }

  // ANNOUNCE clues must be read aloud — echo them into the public feed for everyone.
  if (clue.tag === "ANNOUNCE") {
    const title = `Clue ${clue.code}: ${clue.title}`;
    const already = await prisma.announcement.findFirst({
      where: { gameId: clue.gameId, title },
    });
    if (!already) {
      await prisma.announcement.create({
        data: {
          gameId: clue.gameId,
          kind: "CLUE",
          title,
          body: clue.content,
          phase: clue.phase,
          isReleased: true,
          releasedAt: new Date(),
        },
      });
    }
  }

  return NextResponse.json({
    code: clue.code,
    title: clue.title,
    content: clue.content,
    tag: clue.tag,
    alreadyFound: Boolean(existing),
  });
}
