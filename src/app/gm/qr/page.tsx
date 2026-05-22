import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { getCurrentCharacter } from "@/lib/auth";
import { getDb } from "@/lib/prisma";
import { clueEntryCode } from "@/lib/clueCode";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function QrSheetPage() {
  const gm = await getCurrentCharacter();
  if (!gm) redirect("/");
  if (!gm.isGameMaster) redirect("/play");

  const baseUrl = await getBaseUrl();
  const prisma = await getDb();
  const clues = await prisma.clue.findMany({
    where: { gameId: gm.gameId },
    orderBy: [{ phase: "asc" }, { code: "asc" }],
  });

  const cards = await Promise.all(
    clues.map(async (clue) => ({
      clue,
      qr: await QRCode.toDataURL(`${baseUrl}/clue/${clue.token}`, { margin: 1, width: 300 }),
    })),
  );

  const phases = [2, 3, 4, 5];

  return (
    <main className="min-h-dvh bg-abyss">
      <div className="mx-auto w-full max-w-5xl p-5">
        <header className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4 print:hidden">
          <div>
            <Link href="/gm" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted hover:text-foreground">
              ← Director&apos;s View
            </Link>
            <h1 className="display mt-1 text-2xl text-foreground">Clue QR codes</h1>
            <p className="text-sm text-text-dim" style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>
              Print, cut out, and hide each in its location. Links resolve to{" "}
              <code className="font-mono text-foreground">{baseUrl}/clue/…</code>
            </p>
          </div>
          <PrintButton />
        </header>

        {phases.map((p) => {
          const inPhase = cards.filter((c) => c.clue.phase === p);
          if (inPhase.length === 0) return null;
          return (
            <section key={p} className="mb-8">
              <p className="eyebrow mb-3 print:text-black" style={{ color: "var(--cyan)" }}>
                Phase {p}
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {inPhase.map(({ clue, qr }) => (
                  <div key={clue.id} className="flex flex-col items-center border border-border bg-white p-4 text-center text-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr} alt={`QR for clue ${clue.code}`} className="w-36" />
                    <p className="mt-2 font-mono text-sm font-bold tracking-[0.2em] text-black">
                      {clueEntryCode(clue.token)}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400">
                      {clue.code} · {clue.tag}
                    </p>
                    <h2 className="font-semibold leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                      {clue.title}
                    </h2>
                    <p className="mt-1 text-xs text-gray-600">{clue.location}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
