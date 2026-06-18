// GameRoom — the Durable Object that *is* one room.
//
// A Durable Object is a single, addressable, in-memory object that Cloudflare
// keeps alive and routes all traffic for a given name (here: the room code) to.
// That's exactly what a party-game room needs: one place that holds the live
// game state and every connected socket, with no database round-trips.
//
// This DO owns the connections, the sitting memory (cross-game character
// rotation + scoreboard, GDD section 12), and broadcasting. The game *logic*
// lives in ./game/* — this file is just the plumbing.
//
// Timers are client-driven: timed stages carry an absolute `endsAt`; the TV
// counts down locally and sends `advance` at zero (the host can also skip).
// That keeps the DO simple and avoids server-side alarms entirely.

import { GameEngine } from "./game/engine";
import { Game, STAGE_LOBBY, STAGE_REVEAL } from "./game/game";
import type { Player } from "./game/models";
import { playerState, tvState, type RoomContext } from "./game/serialize";

type Meta = { role: "tv" | "player"; playerId?: string };

export class GameRoom {
  private engine = new GameEngine();
  private game = new Game(this.engine);

  private code: string | null = null;
  private hostId: string | null = null;
  private players = new Map<string, Player>();

  // Sitting memory (persists across games while the DO is alive).
  private gameNumber = 0;
  private usedCharacterKeys = new Set<string>();
  private sittingScores: Record<string, number> = {};
  private scored = new Set<number>();

  // Sockets.
  private tvSockets = new Set<WebSocket>();
  private playerSockets = new Map<string, WebSocket>();
  private pending = new Set<WebSocket>();
  private meta = new WeakMap<WebSocket, Meta>();

  // The runtime constructs this as `new GameRoom(state, env)`. We keep all room
  // state in memory and don't use DO storage, so no explicit constructor is
  // needed — the field initializers above are enough.

  // The Worker forwards the WebSocket upgrade here, tagging it with headers.
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected a websocket", { status: 426 });
    }
    const role = request.headers.get("X-Role") as "tv" | "player" | null;
    const code = request.headers.get("X-Code") ?? "";
    const isCreate = request.headers.get("X-Create") === "1";

    // Refuse to create over a room that's already in use (the Worker will retry
    // with a fresh code). Refuse to join a room that was never created.
    if (role === "tv" && isCreate && this.code !== null) {
      return new Response("room in use", { status: 409 });
    }
    if (role === "player" && this.code === null) {
      return new Response("room not found", { status: 404 });
    }
    if (this.code === null) this.code = code; // first TV (create, or reconnect to an evicted DO)

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.setupSocket(server, role ?? "player");
    return new Response(null, { status: 101, webSocket: client });
  }

  private setupSocket(socket: WebSocket, role: "tv" | "player"): void {
    this.meta.set(socket, { role });
    if (role === "tv") {
      this.tvSockets.add(socket);
      this.sendTo(socket, tvState(this.ctx()));
    } else {
      this.pending.add(socket); // waits for a `join` / `reconnect` message
    }
    socket.addEventListener("message", (event) => {
      void this.onMessage(socket, event.data);
    });
    const drop = () => this.onClose(socket);
    socket.addEventListener("close", drop);
    socket.addEventListener("error", drop);
  }

  private async onMessage(socket: WebSocket, data: string | ArrayBuffer): Promise<void> {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data));
    } catch {
      return;
    }
    const meta = this.meta.get(socket);
    if (!meta) return;

    if (meta.role === "tv") this.handleTv(msg);
    else await this.handlePlayer(socket, meta, msg);

    this.maybeFinalize();
    this.broadcast();
  }

  // -- TV (shared screen) controls -----------------------------------------
  private handleTv(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case "start":
        if (this.players.size < 4) {
          this.errorToTv("Need at least 4 players to begin.");
          return;
        }
        this.startGame();
        break;
      case "advance":
        if (this.game.emergencyActive) this.game.resolveEmergencyVote();
        else this.game.advance();
        break;
      case "next_game":
        this.startGame();
        break;
    }
  }

  // -- phone actions --------------------------------------------------------
  private async handlePlayer(socket: WebSocket, meta: Meta, msg: Record<string, unknown>): Promise<void> {
    if (msg.type === "join") {
      if (this.game.stage !== STAGE_LOBBY) {
        this.sendTo(socket, { type: "error", message: "That game has already started." });
        return;
      }
      const playerId = (msg.playerId as string) || crypto.randomUUID().slice(0, 8);
      this.addPlayer(playerId, (msg.name as string) || "Player", (msg.gender as "male" | "female") || "male");
      this.attachPlayerSocket(socket, meta, playerId);
      this.sendTo(socket, { type: "joined", playerId, roomCode: this.code });
      return;
    }
    if (msg.type === "reconnect") {
      const playerId = msg.playerId as string;
      if (!this.players.has(playerId)) {
        this.sendTo(socket, { type: "error", message: "Could not rejoin that game." });
        return;
      }
      this.players.get(playerId)!.connected = true;
      this.attachPlayerSocket(socket, meta, playerId);
      this.sendTo(socket, { type: "joined", playerId, roomCode: this.code });
      return;
    }

    const pid = meta.playerId;
    if (!pid) return; // not joined yet
    const game = this.game;
    switch (msg.type) {
      case "update":
        if (game.stage === STAGE_LOBBY) {
          const p = this.players.get(pid);
          if (p) {
            if (typeof msg.name === "string") p.name = msg.name;
            if (msg.gender === "male" || msg.gender === "female") p.gender = msg.gender;
          }
        }
        break;
      case "hotseat_vote":
        game.castHotseatVote(pid, msg.target as string);
        break;
      case "set_ban":
        game.setBan(pid, (msg.target as string) ?? null);
        break;
      case "place_token":
        game.placeToken(pid, msg.token as "M" | "A", (msg.target as string) ?? null);
        break;
      case "emergency_flag":
        game.flagEmergency(pid, (msg.target as string) ?? null);
        break;
      case "emergency_vote":
        game.castEmergencyVote(pid, msg.target as string);
        break;
    }
  }

  private attachPlayerSocket(socket: WebSocket, meta: Meta, playerId: string): void {
    // Replace any prior socket for this player (reconnect / refresh).
    this.pending.delete(socket);
    this.playerSockets.set(playerId, socket);
    meta.playerId = playerId;
    this.meta.set(socket, meta);
  }

  // -- game lifecycle -------------------------------------------------------
  private addPlayer(playerId: string, name: string, gender: "male" | "female"): void {
    const existing = this.players.get(playerId);
    if (existing) {
      existing.connected = true;
      return;
    }
    this.players.set(playerId, { id: playerId, name, gender, connected: true });
    if (this.hostId === null) this.hostId = playerId;
  }

  private startGame(): void {
    this.gameNumber++;
    this.game = new Game(this.engine, new Set(this.usedCharacterKeys));
    this.game.start([...this.players.values()]);
  }

  // Fold a finished game into sitting memory + score, exactly once.
  private maybeFinalize(): void {
    if (this.game.stage !== STAGE_REVEAL || this.scored.has(this.gameNumber)) return;
    this.scored.add(this.gameNumber);
    for (const k of this.game.characterKeysUsed()) this.usedCharacterKeys.add(k);
    if (this.game.lastResult?.innocentsWon) {
      for (const pid of this.players.keys()) {
        if (this.game.roleOf(pid) === "innocent") {
          this.sittingScores[pid] = (this.sittingScores[pid] ?? 0) + 1;
        }
      }
    }
  }

  private onClose(socket: WebSocket): void {
    const meta = this.meta.get(socket);
    this.tvSockets.delete(socket);
    this.pending.delete(socket);
    if (meta?.playerId) {
      this.playerSockets.delete(meta.playerId);
      const p = this.players.get(meta.playerId);
      if (p) p.connected = false;
    }
    this.broadcast();
  }

  // -- broadcasting ---------------------------------------------------------
  private broadcast(): void {
    const ctx = this.ctx();
    const tv = tvState(ctx);
    for (const sock of this.tvSockets) this.sendTo(sock, tv);
    for (const [pid, sock] of this.playerSockets) this.sendTo(sock, playerState(ctx, pid));
  }

  private sendTo(socket: WebSocket, payload: unknown): void {
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      /* socket is closing; the close handler will clean it up */
    }
  }

  private errorToTv(message: string): void {
    for (const sock of this.tvSockets) this.sendTo(sock, { type: "error", message });
  }

  private ctx(): RoomContext {
    return {
      code: this.code ?? "",
      hostId: this.hostId,
      game: this.game,
      players: this.players,
      sittingScores: this.sittingScores,
      gameNumber: this.gameNumber,
    };
  }
}
