import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { requireApprovedPlayer } from "@/lib/auth";
import { getPhase } from "@/lib/gameContent";
import { clueEntryCode } from "@/lib/clueCode";

export async function GET() {
  const gate = await requireApprovedPlayer();
  if (gate.error) return gate.error;
  const character = gate.character;

  const game = character.game;
  const round = game.activeVoteRound;
  const prisma = await getDb();

  const [discoveries, announcements, myVote, candidates] = await Promise.all([
    prisma.clueDiscovery.findMany({
      where: { characterId: character.id },
      orderBy: { foundAt: "desc" },
      include: {
        clue: { select: { id: true, token: true, code: true, phase: true, title: true, content: true, tag: true } },
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
      clue: {
        id: d.clue.id,
        code: clueEntryCode(d.clue.token),
        title: d.clue.title,
        content: d.clue.content,
        tag: d.clue.tag,
        image: `/clues/${d.clue.code}.png`,
      },
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
