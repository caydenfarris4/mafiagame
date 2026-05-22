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

  const character = await getCurrentCharacter();
  if (!character) {
    redirect(`/?next=${encodeURIComponent(`/clue/${token}`)}`);
  }

  return <ClueReveal token={token} />;
}
