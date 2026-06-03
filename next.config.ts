import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export the UI to static HTML/JS in ./out. The Cloudflare Worker
  // (src/worker) serves these files and routes /ws to the game's Durable
  // Object — so there's no Next.js server at runtime, just static assets.
  output: "export",
  // Static export can't run the on-the-fly image optimizer; we use plain CSS
  // and emoji, so disable it.
  images: { unoptimized: true },
  // Emit each route as a directory with index.html (e.g. /play/ -> play/index.html),
  // which Workers static assets serve cleanly.
  trailingSlash: true,
};

export default nextConfig;
