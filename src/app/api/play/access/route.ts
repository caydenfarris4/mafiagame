import { NextResponse } from "next/server";
import { getAccess } from "@/lib/auth";

// Polled by the waiting room so a guest's screen flips to the game the moment
// the host approves them. Also serves as a heartbeat for the GM's roster.
export async function GET() {
  const access = await getAccess();
  return NextResponse.json({ status: access.status });
}
