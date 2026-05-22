import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";
import { clueEntryCode, normalizeEntryCode } from "@/lib/clueCode";

// Manual-entry fallback for the in-app scanner: resolve the 6-char code printed
// on a clue tag to its token so the client can open /clue/<token>. The code is
// derived from the token (see clueCode.ts), so guessing sequential codes fails.
export async function GET(request: Request) {
  const character = await getCurrentCharacter();
  if (!character) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const code = normalizeEntryCode(new URL(request.url).searchParams.get("code") ?? "");
  if (!code) {
    return NextResponse.json({ error: "Enter a code." }, { status: 400 });
  }

  const prisma = await getDb();
  const clues = await prisma.clue.findMany({
    where: { gameId: character.gameId },
    select: { token: true },
  });
  const match = clues.find((c) => clueEntryCode(c.token) === code);
  if (!match) {
    return NextResponse.json({ error: "No clue with that code." }, { status: 404 });
  }

  return NextResponse.json({ token: match.token });
}
