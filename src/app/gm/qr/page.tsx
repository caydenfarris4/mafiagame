import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { getCurrentCharacter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const clues = await prisma.clue.findMany({
    where: { gameId: gm.gameId },
    orderBy: { createdAt: "asc" },
  });

  const cards = await Promise.all(
    clues.map(async (clue) => {
      const url = `${baseUrl}/clue/${clue.token}`;
      const qr = await QRCode.toDataURL(url, { margin: 1, width: 320 });
      return { clue, url, qr };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-5">
      <header className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4 print:hidden">
        <div>
          <Link
            href="/gm"
            className="text-xs uppercase tracking-widest text-muted hover:text-foreground"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Clue QR codes</h1>
          <p className="text-sm text-muted">
            Print and hide these around the house. Each links to{" "}
            <code className="text-foreground">{baseUrl}/clue/…</code>
          </p>
        </div>
        <PrintButton />
      </header>

      {cards.length === 0 ? (
        <p className="text-sm text-muted">No clues yet. Add some in the seed.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {cards.map(({ clue, url, qr }) => (
            <div
              key={clue.id}
              className="flex flex-col items-center rounded-xl border border-border bg-white p-4 text-center text-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR code for ${clue.title}`} className="w-40" />
              <h2 className="mt-2 font-bold">{clue.title}</h2>
              {clue.location && (
                <p className="text-xs text-gray-600">Hide: {clue.location}</p>
              )}
              <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">
                {clue.visibility}
              </p>
              <p className="mt-1 break-all text-[9px] text-gray-400">{url}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
