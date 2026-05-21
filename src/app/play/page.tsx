import { redirect } from "next/navigation";
import { getCurrentCharacter } from "@/lib/auth";
import { getPhase, LAST_NIGHT } from "@/lib/gameContent";
import LogoutButton from "@/components/LogoutButton";
import PlayBoard from "@/components/PlayBoard";

export const dynamic = "force-dynamic";

type Section = { heading: string; body: string };

const ROLE_LABEL: Record<string, string> = {
  KILLER: "Guest",
  ACCOMPLICE: "Guest",
  SINNER: "Guest",
  GM: "House Manager",
};

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
    <main className="mx-auto w-full max-w-2xl flex-1 p-5">
      <header className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: character.avatarColor ?? "#7a1020" }}
          >
            {character.personaName.charAt(0)}
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight">{character.personaName}</h1>
            <p className="text-xs uppercase tracking-widest text-muted">
              {character.realName} · {ROLE_LABEL[character.role] ?? "Guest"}
            </p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <PlayBoard
        prop={character.prop}
        sheet={sheet}
        lastNight={LAST_NIGHT}
        initial={initial}
      />
    </main>
  );
}
