import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

// A player chooses to share a KEEP clue they found with the whole house.
export async function POST(request: Request) {
  const character = await getCurrentCharacter();
  if (!character) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { clueId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.clueId !== "string") {
    return NextResponse.json({ error: "Missing clue." }, { status: 400 });
  }

  const discovery = await prisma.clueDiscovery.findUnique({
    where: { clueId_characterId: { clueId: body.clueId, characterId: character.id } },
    include: { clue: true },
  });
  if (!discovery) {
    return NextResponse.json({ error: "You haven't found that clue." }, { status: 404 });
  }

  if (!discovery.shared) {
    await prisma.clueDiscovery.update({
      where: { id: discovery.id },
      data: { shared: true },
    });

    const title = `Clue ${discovery.clue.code}: ${discovery.clue.title}`;
    const already = await prisma.announcement.findFirst({
      where: { gameId: character.gameId, title },
    });
    if (!already) {
      await prisma.announcement.create({
        data: {
          gameId: character.gameId,
          kind: "SHARED_CLUE",
          title,
          body: `${discovery.clue.content}\n\nShared by ${character.personaName}.`,
          phase: discovery.clue.phase,
          isReleased: true,
          releasedAt: new Date(),
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
