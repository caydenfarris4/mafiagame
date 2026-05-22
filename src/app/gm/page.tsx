import { redirect } from "next/navigation";
import { getCurrentCharacter } from "@/lib/auth";
import { getPhase } from "@/lib/gameContent";
import LogoutButton from "@/components/LogoutButton";
import GmDashboard from "@/components/GmDashboard";
import { Atmosphere } from "@/components/Atmosphere";

export const dynamic = "force-dynamic";

export default async function GmPage() {
  const gm = await getCurrentCharacter();
  if (!gm) redirect("/");
  if (!gm.isGameMaster) redirect("/play");

  const game = gm.game;
  const initial = {
    game: {
      name: game.name,
      status: game.status,
      currentPhase: game.currentPhase,
      activeVoteRound: game.activeVoteRound,
    },
    phase: getPhase(game.currentPhase),
    discoveries: [],
    clues: [],
    characters: [],
    library: [],
    votes: [],
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-abyss">
      <Atmosphere intensity={1} tide />
      <div className="relative z-[2] mx-auto w-full max-w-3xl p-5">
        <header className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="eyebrow" style={{ color: "var(--brass)" }}>
              Game Master · Alexander
            </p>
            <h1 className="display text-2xl text-foreground">Director&apos;s View</h1>
          </div>
          <LogoutButton />
        </header>

        <GmDashboard initial={initial} />
      </div>
    </main>
  );
}
