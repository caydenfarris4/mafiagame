// The Worker entry point.
//
// Two jobs:
//   1. /ws  → route the WebSocket upgrade to the right room (a GameRoom Durable
//             Object, addressed by room code).
//   2. else → serve the exported Next.js UI from the static-assets binding.
//
// Same origin for both, so the browser's WebSocket "just works" with no CORS
// and no second host to deploy.

import { GameRoom } from "./GameRoom";
import { GameRNG } from "./game/rng";
import type { Env } from "./types";

export { GameRoom };

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/ws") return handleWebSocket(request, env, url);
    // Everything else is a static asset (the built UI).
    return env.ASSETS.fetch(request);
  },
};

export default worker;

async function handleWebSocket(request: Request, env: Env, url: URL): Promise<Response> {
  const role = url.searchParams.get("role");
  const code = url.searchParams.get("code");

  if (role !== "tv" && role !== "player") {
    return new Response("missing role", { status: 400 });
  }

  // TV with no code = create a new room. Generate a code and try to claim it;
  // on the rare collision with a live room the DO returns 409 and we retry.
  if (role === "tv" && !code) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = new GameRNG().roomCode();
      const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(candidate));
      const res = await stub.fetch(forward(request, { role, code: candidate, create: true }));
      if (res.status === 101) return res; // socket established
    }
    return new Response("could not allocate a room", { status: 503 });
  }

  // Otherwise we need a specific room: a phone joining, or a TV reconnecting.
  if (!code) return new Response("missing room code", { status: 400 });
  const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
  return stub.fetch(forward(request, { role, code }));
}

// Re-wrap the upgrade request with routing headers the DO reads.
function forward(request: Request, opts: { role: string; code: string; create?: boolean }): Request {
  const headers = new Headers(request.headers);
  headers.set("X-Role", opts.role);
  headers.set("X-Code", opts.code);
  if (opts.create) headers.set("X-Create", "1");
  return new Request(request, { headers });
}
