import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getCurrentCharacter } from "@/lib/auth";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const character = await getCurrentCharacter();

  if (character) {
    redirect(next || (character.isGameMaster ? "/gm" : "/play"));
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-gold">
            Campus Home presents
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            A House of Secrets
          </h1>
          <p className="mt-3 text-muted">
            Log in as your character. Trust no one. Find the clues before the
            mafia finds you.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Lost your code? Find the game master.
        </p>
      </div>
    </main>
  );
}
