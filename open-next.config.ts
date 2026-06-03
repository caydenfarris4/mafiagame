import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext-on-Cloudflare config. No external cache (R2/KV) is wired up.
// The app is a thin client; all game state lives in the Python server (./server),
// reached over a WebSocket, so the Worker only serves the TV + phone UI.
export default defineCloudflareConfig();
