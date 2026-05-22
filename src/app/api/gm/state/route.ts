import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";
import { getPhase } from "@/lib/gameContent";
import { isCountryAllowed } from "@/lib/requestInfo";

// A device counts as "online" if it checked in within this window.
const ONLINE_WINDOW_MS = 30_000;

export async function GET() {
  const gm = await getCurrentCharacter();
  if (!gm || !gm.isGameMaster) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const gameId = gm.gameId;
  const game = gm.game;
  const prisma = await getDb();

  const [discoveries, clues, characters, library, votes, sessions] = await Promise.all([
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
    prisma.playerSession.findMany({
      where: { gameId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        character: { select: { personaName: true, realName: true, avatarColor: true } },
      },
    }),
  ]);

  const now = Date.now();

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
      loginCode: c.loginCode,
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
    sessions: sessions.map((s) => ({
      id: s.id,
      status: s.status,
      ip: s.ipAddress,
      country: s.country,
      city: s.city,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
      online: now - s.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
      foreign: !isCountryAllowed(s.country),
      character: s.character,
    })),
  });
}
