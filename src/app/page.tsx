import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getCurrentCharacter } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  return <LoginForm next={next} />;
}
