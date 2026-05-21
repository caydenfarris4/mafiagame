import { PrismaClient } from "@prisma/client";

// The Prisma client is engine-free (queryCompiler), so every instance needs a
// driver adapter:
//  - On Cloudflare Workers, bind to the request's D1 database.
//  - Locally (and any non-Cloudflare runtime), use libSQL against the dev file.
//
// Server code calls `await getDb()` rather than importing a shared instance,
// because the D1 binding only exists inside a request's Cloudflare context.

const globalForPrisma = globalThis as unknown as { prismaLocal?: PrismaClient };

async function cloudflareDb(): Promise<PrismaClient | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const d1 = (env as Record<string, unknown>).DB;
    if (!d1) return null;
    // The workerd-targeted client loads its query-compiler WASM as a module.
    const { PrismaClient: EdgeClient } = await import("@/generated/prisma/client");
    const { PrismaD1 } = await import("@prisma/adapter-d1");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new PrismaD1(d1 as any);
    return new EdgeClient({ adapter }) as unknown as PrismaClient;
  } catch {
    // Not running on Cloudflare (or context unavailable) — fall back to local.
    return null;
  }
}

async function localDb(): Promise<PrismaClient> {
  if (globalForPrisma.prismaLocal) return globalForPrisma.prismaLocal;
  // DATABASE_URL is "file:./dev.db" relative to the prisma/ dir for the CLI;
  // libSQL resolves from the project root, so point it at prisma/dev.db.
  const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
  const adapter = new PrismaLibSQL({ url: "file:./prisma/dev.db" });
  const client = new PrismaClient({ adapter });
  globalForPrisma.prismaLocal = client;
  return client;
}

export async function getDb(): Promise<PrismaClient> {
  const cf = await cloudflareDb();
  return cf ?? (await localDb());
}
