import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

// Manual-entry fallback for the in-app scanner: resolve a clue code (e.g. "2-1")
// to its token so the client can open /clue/<token>.
export async function GET(request: Request) {
  const character = await getCurrentCharacter();
  if (!character) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  const prisma = await getDb();
  const clue = await prisma.clue.findFirst({
    where: { gameId: character.gameId, code },
    select: { token: true },
  });
  if (!clue) {
    return NextResponse.json({ error: "No clue with that code." }, { status: 404 });
  }

  return NextResponse.json({ token: clue.token });
}
