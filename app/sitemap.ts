import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { TENANTS, resolveTenant } from "@/app/lib/tenant";

// The pages reachable without a session on this host: the tenant's publicPaths,
// or Origo's landing, about and privacy pages on the root host.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const tenant = resolveTenant(host.split(":")[0]);

  const paths = tenant ? TENANTS[tenant].publicPaths ?? [] : ["/", "/om", "/integritet"];
  return paths.map((path) => ({ url: `${protocol}://${host}${path === "/" ? "" : path}` }));
}
