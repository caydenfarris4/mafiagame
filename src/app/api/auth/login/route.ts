import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { normalizeCode } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.code !== "string" || body.code.trim() === "") {
    return NextResponse.json({ error: "Enter your code." }, { status: 400 });
  }

  const prisma = await getDb();
  const character = await prisma.character.findUnique({
    where: { loginCode: normalizeCode(body.code) },
  });

  if (!character) {
    return NextResponse.json(
      { error: "That code didn't match anyone. Check with your game master." },
      { status: 401 },
    );
  }

  const session = await getSession();
  session.characterId = character.id;
  await session.save();

  return NextResponse.json({
    ok: true,
    redirect: character.isGameMaster ? "/gm" : "/play",
  });
}
