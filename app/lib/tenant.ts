export type TenantId = "verso" | "flux";

export const TENANTS: Record<TenantId, { name: string }> = {
  verso: { name: "Verso" },
  flux: { name: "Flux" },
};

export function resolveTenant(hostname: string): TenantId | null {
  const subdomain = hostname.split(".")[0] as TenantId;
  return subdomain in TENANTS ? subdomain : null;
}
