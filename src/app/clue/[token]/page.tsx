import { redirect } from "next/navigation";
import { getCurrentCharacter } from "@/lib/auth";
import ClueReveal from "@/components/ClueReveal";

export const dynamic = "force-dynamic";

export default async function CluePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Must be logged in to record the discovery. Send them to login, then back here.
  const character = await getCurrentCharacter();
  if (!character) {
    redirect(`/?next=${encodeURIComponent(`/clue/${token}`)}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <ClueReveal token={token} />
      </div>
    </main>
  );
}
