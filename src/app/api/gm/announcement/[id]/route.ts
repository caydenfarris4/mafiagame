import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

// GM fires (or retracts) a scripted reveal / Solomon line into the player feed.
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

  const ann = await prisma.announcement.findUnique({ where: { id } });
  if (!ann || ann.gameId !== gm.gameId) {
    return NextResponse.json({ error: "Unknown announcement." }, { status: 404 });
  }

  const released = Boolean(body.released);
  const updated = await prisma.announcement.update({
    where: { id },
    data: { isReleased: released, releasedAt: released ? new Date() : null },
  });

  return NextResponse.json({ ok: true, isReleased: updated.isReleased });
}
