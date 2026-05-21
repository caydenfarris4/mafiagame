import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { getCurrentCharacter } from "@/lib/auth";
import { getDb } from "@/lib/prisma";
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
    <main className="mx-auto w-full max-w-5xl flex-1 p-5">
      <header className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4 print:hidden">
        <div>
          <Link href="/gm" className="text-xs uppercase tracking-widest text-muted hover:text-foreground">← Dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold">Clue QR codes</h1>
          <p className="text-sm text-muted">
            Print, cut out, and hide each in its location. Links resolve to{" "}
            <code className="text-foreground">{baseUrl}/clue/…</code>
          </p>
        </div>
        <PrintButton />
      </header>

      {phases.map((p) => {
        const inPhase = cards.filter((c) => c.clue.phase === p);
        if (inPhase.length === 0) return null;
        return (
          <section key={p} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold print:text-black">
              Phase {p}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {inPhase.map(({ clue, qr }) => (
                <div key={clue.id} className="flex flex-col items-center rounded-xl border border-border bg-white p-4 text-center text-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt={`QR for clue ${clue.code}`} className="w-36" />
                  <p className="mt-2 font-mono text-xs text-gray-500">
                    {clue.code} · {clue.tag}
                  </p>
                  <h3 className="font-bold leading-tight">{clue.title}</h3>
                  <p className="mt-1 text-xs text-gray-600">{clue.location}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
