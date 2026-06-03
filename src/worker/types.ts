// Bindings configured in wrangler.jsonc and injected into the Worker / DO.
export interface Env {
  // Static assets (the exported Next.js UI in ./out).
  ASSETS: Fetcher;
  // The per-room Durable Object namespace.
  GAME_ROOM: DurableObjectNamespace;
}
