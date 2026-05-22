import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getCurrentCharacter } from "@/lib/auth";

// The game master admits, removes, or deletes a player device from his roster.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gm = await getCurrentCharacter();
  if (!gm || !gm.isGameMaster) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action;
  if (action !== "approve" && action !== "block" && action !== "remove") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const prisma = await getDb();
  const playerSession = await prisma.playerSession.findUnique({ where: { id } });
  if (!playerSession || playerSession.gameId !== gm.gameId) {
    return NextResponse.json({ error: "Unknown session." }, { status: 404 });
  }

  if (action === "remove") {
    await prisma.playerSession.delete({ where: { id } });
    return NextResponse.json({ ok: true, removed: true });
  }

  const approved = action === "approve";
  const updated = await prisma.playerSession.update({
    where: { id },
    data: {
      status: approved ? "APPROVED" : "BLOCKED",
      approvedAt: approved ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
