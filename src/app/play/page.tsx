import { redirect } from "next/navigation";
import { getCurrentCharacter } from "@/lib/auth";
import { getPhase, LAST_NIGHT } from "@/lib/gameContent";
import LogoutButton from "@/components/LogoutButton";
import PlayBoard from "@/components/PlayBoard";
import { Atmosphere } from "@/components/Atmosphere";

export const dynamic = "force-dynamic";

type Section = { heading: string; body: string };

export default async function PlayPage() {
  const character = await getCurrentCharacter();
  if (!character) redirect("/");
  if (character.isGameMaster) redirect("/gm");

  let sheet: Section[] = [];
  try {
    sheet = JSON.parse(character.sheet);
  } catch {
    sheet = [];
  }

  const game = character.game;
  const initial = {
    game: {
      name: game.name,
      status: game.status,
      currentPhase: game.currentPhase,
      activeVoteRound: game.activeVoteRound,
    },
    phase: getPhase(game.currentPhase),
    discoveries: [],
    announcements: [],
    myVote: null,
    candidates: [],
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-abyss">
      <Atmosphere intensity={1} tide />
      <div className="relative z-[2] mx-auto w-full max-w-2xl p-5">
        <header className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center font-mono text-lg text-foreground"
              style={{
                background: `repeating-linear-gradient(135deg, ${character.avatarColor ?? "#7a3338"}, ${character.avatarColor ?? "#7a3338"} 5px, color-mix(in oklch, ${character.avatarColor ?? "#7a3338"}, black 25%) 5px, color-mix(in oklch, ${character.avatarColor ?? "#7a3338"}, black 25%) 10px)`,
              }}
            >
              {character.personaName.charAt(0)}
            </span>
            <div>
              <p className="eyebrow" style={{ color: "var(--cyan)" }}>
                Dossier assigned
              </p>
              <h1 className="display text-xl leading-tight text-foreground">{character.personaName}</h1>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{character.realName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="pill pill-live">
              <span className="dot" /> Live
            </span>
            <LogoutButton />
          </div>
        </header>

        <PlayBoard prop={character.prop} sheet={sheet} lastNight={LAST_NIGHT} initial={initial} />
      </div>
    </main>
  );
}
