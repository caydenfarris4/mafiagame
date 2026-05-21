import { redirect } from "next/navigation";
import { getCurrentCharacter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import PlayBoard from "@/components/PlayBoard";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  MAFIA: "Mafia",
  DETECTIVE: "Detective",
  CIVILIAN: "Civilian",
};

export default async function PlayPage() {
  const character = await getCurrentCharacter();
  if (!character) redirect("/");
  if (character.isGameMaster) redirect("/gm");

  const [discoveries, announcements] = await Promise.all([
    prisma.clueDiscovery.findMany({
      where: { characterId: character.id },
      orderBy: { foundAt: "desc" },
      include: {
        clue: { select: { id: true, title: true, content: true, visibility: true } },
      },
    }),
    prisma.clue.findMany({
      where: { gameId: character.gameId, visibility: "PUBLIC", isReleased: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true },
    }),
  ]);

  const initial = {
    discoveries: discoveries.map((d) => ({
      id: d.id,
      foundAt: d.foundAt.toISOString(),
      clue: d.clue,
    })),
    announcements,
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-5">
      <header className="mb-8 flex items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: character.avatarColor ?? "#7a1020" }}
          >
            {character.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight">{character.name}</h1>
            <p className="text-xs uppercase tracking-widest text-muted">
              {character.realName ? `${character.realName} · ` : ""}
              {ROLE_LABELS[character.role] ?? character.role}
              {character.isAlive ? "" : " · eliminated"}
            </p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <PlayBoard initial={initial} />
    </main>
  );
}
