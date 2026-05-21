import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";
import { getPhase } from "@/lib/gameContent";

export async function GET() {
  const gm = await getCurrentCharacter();
  if (!gm || !gm.isGameMaster) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const gameId = gm.gameId;
  const game = gm.game;

  const [discoveries, clues, characters, library, votes] = await Promise.all([
    prisma.clueDiscovery.findMany({
      where: { clue: { gameId } },
      orderBy: { foundAt: "desc" },
      take: 250,
      include: {
        character: { select: { id: true, personaName: true, realName: true, avatarColor: true } },
        clue: { select: { id: true, code: true, title: true, tag: true, location: true, phase: true } },
      },
    }),
    prisma.clue.findMany({
      where: { gameId },
      orderBy: [{ phase: "asc" }, { code: "asc" }],
      include: { _count: { select: { discoveries: true } } },
    }),
    prisma.character.findMany({
      where: { gameId, isGameMaster: false },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { discoveries: true } } },
    }),
    prisma.announcement.findMany({
      where: { gameId, isScripted: true },
      orderBy: [{ sortOrder: "asc" }],
    }),
    prisma.vote.findMany({ where: { gameId }, include: { voter: { select: { personaName: true } } } }),
  ]);

  return NextResponse.json({
    game: {
      name: game.name,
      status: game.status,
      currentPhase: game.currentPhase,
      activeVoteRound: game.activeVoteRound,
    },
    phase: getPhase(game.currentPhase),
    discoveries: discoveries.map((d) => ({
      id: d.id,
      shared: d.shared,
      foundAt: d.foundAt.toISOString(),
      character: d.character,
      clue: d.clue,
    })),
    clues: clues.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      tag: c.tag,
      phase: c.phase,
      location: c.location,
      found: c._count.discoveries,
    })),
    characters: characters.map((c) => ({
      id: c.id,
      personaName: c.personaName,
      realName: c.realName,
      role: c.role,
      avatarColor: c.avatarColor,
      found: c._count.discoveries,
    })),
    library: library.map((a) => ({
      id: a.id,
      kind: a.kind,
      phase: a.phase,
      title: a.title,
      body: a.body,
      isReleased: a.isReleased,
    })),
    votes: votes.map((v) => ({ round: v.round, accusedName: v.accusedName, voter: v.voter.personaName })),
  });
}
