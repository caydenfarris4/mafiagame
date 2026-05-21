import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext-on-Cloudflare config. No external cache (R2/KV) is wired up;
// the app's data lives in D1, and pages are server-rendered on demand.
export default defineCloudflareConfig();
