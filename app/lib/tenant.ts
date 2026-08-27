export type TenantId = "verso" | "flux" | "tempus" | "apsis"

type TenantConfig = {
  name: string
  // Path prefixes reachable without a session. "/" matches only the tenant root;
  // any other value also matches its sub-paths (e.g. "/blog" covers "/blog/x").
  // proxy.ts skips the login redirect for these; the pages themselves must still
  // render correctly for anonymous visitors (DAL calls return empty when logged
  // out, and any API they read must allow anonymous access).
  publicPaths?: string[]
}

export const TENANTS: Record<TenantId, TenantConfig> = {
  verso: { name: "Verso" },
  flux: { name: "Flux" },
  tempus: { name: "Tempus", publicPaths: ["/", '/maps'] },
  apsis: { name: "Apsis", publicPaths: ["/"] },
}

export function isPublicPath(tenant: TenantId, pathname: string): boolean {
  const publicPaths = TENANTS[tenant].publicPaths
  if (!publicPaths) return false
  return publicPaths.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function resolveTenant(hostname: string): TenantId | null {
  const subdomain = hostname.split(".")[0] as TenantId
  return subdomain in TENANTS ? subdomain : null
}
