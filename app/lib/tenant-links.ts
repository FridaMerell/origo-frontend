import { TENANTS, type TenantId } from "@/app/lib/tenant"

export type AppLinkId = "origo" | TenantId

export type AppLink = {
  id: AppLinkId
  name: string
}

// The Origo root plus every tenant, in the order they should appear in the
// link dash / app switcher.
export const APP_LINKS: AppLink[] = [
  { id: "origo", name: "Origo" },
  ...(Object.keys(TENANTS) as TenantId[]).map((id) => ({ id, name: TENANTS[id].name })),
]

function isTenantLabel(label: string): label is TenantId {
  return label in TENANTS
}

// Builds an absolute URL to another app by swapping the sub-domain on the
// current host. "origo" targets the bare root domain. Falls back to "#" during
// SSR since it depends on window.location.
export function appHref(target: AppLinkId): string {
  if (typeof window === "undefined") return "#"
  const { hostname, protocol, port } = window.location
  const parts = hostname.split(".")
  const onTenant = isTenantLabel(parts[0])

  if (target === "origo") {
    if (onTenant) parts.shift()
  } else if (onTenant) {
    parts[0] = target
  } else {
    parts.unshift(target)
  }

  return `${protocol}//${parts.join(".")}${port ? `:${port}` : ""}/`
}

// The tenant the current host belongs to, or "origo" when on the root domain.
export function currentAppId(): AppLinkId {
  if (typeof window === "undefined") return "origo"
  const label = window.location.hostname.split(".")[0]
  return isTenantLabel(label) ? label : "origo"
}
