import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  // *.localhost: the in-app browser pane treats loopback hosts as the project's own dev
  // server, while *.origo.test (a private-network host) gets a permission prompt per action.
  allowedDevOrigins: ["verso.origo.test","flux.origo.test","tempus.origo.test","apsis.origo.test","origo.test", "opus.origo.test", "*.localhost"],
  experimental: {
    // Turbopack's persistent FS cache does not prune (Next upstream). It grew to
    // ~2.4GB of .sst here and reloaded into the Node process until .next was wiped.
    // Off = no unbounded disk cache; cold compile is slower, sessions stay usable.
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    // /api/files always carries a dynamic ?url= value, so search can't be
    // pinned to an exact string here — the route itself validates the url.
    localPatterns: [{ pathname: "/api/files" }],
  },
  async headers() {
    return [
      {
        // The push service worker must never be cached — clients need to pick
        // up new logic immediately.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ]
  },
}

export default nextConfig
