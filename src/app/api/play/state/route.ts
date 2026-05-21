import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";
import { getPhase } from "@/lib/gameContent";

export async function GET() {
  const character = await getCurrentCharacter();
  if (!character) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const game = character.game;
  const round = game.activeVoteRound;

  const [discoveries, announcements, myVote, candidates] = await Promise.all([
    prisma.clueDiscovery.findMany({
      where: { characterId: character.id },
      orderBy: { foundAt: "desc" },
      include: {
        clue: { select: { id: true, code: true, title: true, content: true, tag: true } },
      },
    }),
    prisma.announcement.findMany({
      where: { gameId: game.id, isReleased: true },
      orderBy: { releasedAt: "desc" },
    }),
    round
      ? prisma.vote.findUnique({
          where: {
            gameId_round_voterId: {
              gameId: game.id,
              round,
              voterId: character.id,
            },
          },
        })
      : Promise.resolve(null),
    prisma.character.findMany({
      where: { gameId: game.id, isGameMaster: false, id: { not: character.id } },
      orderBy: { sortOrder: "asc" },
      select: { personaName: true },
    }),
  ]);

  const phase = getPhase(game.currentPhase);

  return NextResponse.json({
    game: {
      name: game.name,
      status: game.status,
      currentPhase: game.currentPhase,
      activeVoteRound: round,
    },
    phase,
    discoveries: discoveries.map((d) => ({
      id: d.id,
      shared: d.shared,
      foundAt: d.foundAt.toISOString(),
      clue: d.clue,
    })),
    announcements: announcements.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      body: a.body,
      releasedAt: (a.releasedAt ?? a.createdAt).toISOString(),
    })),
    myVote: myVote ? { accusedName: myVote.accusedName } : null,
    candidates: candidates.map((c) => c.personaName),
  });
}
