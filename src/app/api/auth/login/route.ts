import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { normalizeCode } from "@/lib/auth";
import { getRequestInfo, isCountryAllowed } from "@/lib/requestInfo";

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

  // Silo the game to the family at the lake house: a login from a known foreign
  // country is almost certainly a bot that scraped the public URL, so refuse it.
  const info = await getRequestInfo(request);
  if (!isCountryAllowed(info.country)) {
    return NextResponse.json(
      {
        error:
          "This game is locked to its location. If you're with the family and seeing this, ask Alex to add your region.",
      },
      { status: 403 },
    );
  }

  const session = await getSession();
  session.characterId = character.id;

  // The host is trusted and bypasses the approval gate; everyone else queues as
  // PENDING until the game master confirms the device is a real guest.
  if (character.isGameMaster) {
    delete session.sessionId;
  } else {
    const playerSession = await prisma.playerSession.create({
      data: {
        gameId: character.gameId,
        characterId: character.id,
        status: "PENDING",
        ipAddress: info.ip,
        country: info.country,
        city: info.city,
        userAgent: info.userAgent,
      },
    });
    session.sessionId = playerSession.id;
  }

  await session.save();

  return NextResponse.json({
    ok: true,
    redirect: character.isGameMaster ? "/gm" : "/play",
    pending: !character.isGameMaster,
  });
}
