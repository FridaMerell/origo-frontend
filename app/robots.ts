import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// Served per host (excluded from proxy.ts, so never gated or tenant-rewritten).
// Private pages are kept out by the login redirect, not by Disallow: Google can
// still list a disallowed URL without a snippet.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${protocol}://${host}/sitemap.xml`,
  };
}
