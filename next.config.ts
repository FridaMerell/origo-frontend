import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["verso.origo.test","flux.origo.test","tempus.origo.test","apsis.origo.test","origo.test"],
  images: {
    // /api/files always carries a dynamic ?url= value, so search can't be
    // pinned to an exact string here — the route itself validates the url.
    localPatterns: [{ pathname: "/api/files" }],
  },
}

export default nextConfig
