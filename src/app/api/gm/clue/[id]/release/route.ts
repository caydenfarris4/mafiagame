import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gm = await getCurrentCharacter();
  if (!gm || !gm.isGameMaster) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  let body: { released?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const clue = await prisma.clue.findUnique({ where: { id } });
  if (!clue || clue.gameId !== gm.gameId) {
    return NextResponse.json({ error: "Unknown clue." }, { status: 404 });
  }

  const updated = await prisma.clue.update({
    where: { id },
    data: { isReleased: Boolean(body.released) },
  });

  return NextResponse.json({ ok: true, isReleased: updated.isReleased });
}
