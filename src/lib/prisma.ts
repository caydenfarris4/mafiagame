import type { PrismaClient } from "@prisma/client";

// The Prisma client is engine-free (queryCompiler), so every instance needs a
// driver adapter:
//  - On Cloudflare Workers, bind to the request's D1 database.
//  - Locally (and any non-Cloudflare runtime), use libSQL against the dev file.
//
// Both paths use the SAME generated workerd client (src/generated/prisma); the
// Node client (@prisma/client) is intentionally never imported at runtime so its
// ~1.8 MB query-compiler WASM stays out of the Worker bundle, which otherwise
// pushes us past the Workers size limit. (@prisma/client is used only as a type
// here, which is erased at build time.)
//
// Server code calls `await getDb()` rather than importing a shared instance,
// because the D1 binding only exists inside a request's Cloudflare context.

const globalForPrisma = globalThis as unknown as {
  prismaLocal?: PrismaClient;
  prismaCf?: PrismaClient;
  prismaCfD1?: unknown;
};

async function cloudflareDb(): Promise<PrismaClient | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const d1 = (env as Record<string, unknown>).DB;
    if (!d1) return null;
    // Reuse the client across requests in this isolate. The D1 binding is
    // isolate-global (not request-scoped I/O), so building the client — and
    // instantiating its query-compiler WASM — once instead of on every request
    // removes the main cold-start / CPU-limit pressure without changing any
    // query behavior. Keyed on the binding identity so a fresh isolate rebuilds.
    if (globalForPrisma.prismaCf && globalForPrisma.prismaCfD1 === d1) {
      return globalForPrisma.prismaCf;
    }
    // The workerd-targeted client loads its query-compiler WASM as a module.
    const { PrismaClient: EdgeClient } = await import("@/generated/prisma/client");
    const { PrismaD1 } = await import("@prisma/adapter-d1");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new PrismaD1(d1 as any);
    const client = new EdgeClient({ adapter }) as unknown as PrismaClient;
    globalForPrisma.prismaCf = client;
    globalForPrisma.prismaCfD1 = d1;
    return client;
  } catch {
    // Not running on Cloudflare (or context unavailable) — fall back to local.
    return null;
  }
}

async function localDb(): Promise<PrismaClient> {
  if (globalForPrisma.prismaLocal) return globalForPrisma.prismaLocal;
  // Reuse the generated workerd client (not the Node @prisma/client) so the
  // Worker bundle never pulls in the Node client's WASM. DATABASE_URL is
  // "file:./dev.db" relative to the prisma/ dir for the CLI; libSQL resolves
  // from the project root, so point it at prisma/dev.db.
  const { PrismaClient: LocalClient } = await import("@/generated/prisma/client");
  const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
  const adapter = new PrismaLibSQL({ url: "file:./prisma/dev.db" });
  const client = new LocalClient({ adapter }) as unknown as PrismaClient;
  globalForPrisma.prismaLocal = client;
  return client;
}

export async function getDb(): Promise<PrismaClient> {
  const cf = await cloudflareDb();
  return cf ?? (await localDb());
}
