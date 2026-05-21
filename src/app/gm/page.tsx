import { redirect } from "next/navigation";
import { getCurrentCharacter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import GmDashboard from "@/components/GmDashboard";

export const dynamic = "force-dynamic";

export default async function GmPage() {
  const gm = await getCurrentCharacter();
  if (!gm) redirect("/");
  if (!gm.isGameMaster) redirect("/play");

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

  const initial = {
    discoveries: discoveries.map((d) => ({ ...d, foundAt: d.foundAt.toISOString() })),
    clues,
    characters,
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-5">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">
            Game Master
          </p>
          <h1 className="text-2xl font-bold">{gm.game.name}</h1>
        </div>
        <LogoutButton />
      </header>

      <GmDashboard initial={initial} />
    </main>
  );
}
