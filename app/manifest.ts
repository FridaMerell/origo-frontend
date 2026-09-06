import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveTenant, TENANTS, type TenantId } from "@/app/lib/tenant";

// One manifest route served per subdomain tenant. `headers()` makes this
// dynamic, so verso/flux/tempus/apsis each get their own name, colours and
// icons while sharing a single `/manifest.webmanifest` endpoint.

type TenantManifest = {
  description: string;
  background_color: string;
  theme_color: string;
};

const TENANT_MANIFESTS: Record<TenantId, TenantManifest> = {
  verso: {
    description: "Verso – Origo",
    background_color: "#FFFBF2",
    theme_color: "#A86B27",
  },
  flux: {
    description: "Flux – Origo",
    background_color: "#EEF3F5",
    theme_color: "#D85B32",
  },
  tempus: {
    description: "Tempus – Origo",
    background_color: "#FAF8EF",
    theme_color: "#A4410D",
  },
  apsis: {
    description: "Apsis – Origo",
    background_color: "#EDE7D8",
    theme_color: "#4B5A3E",
  },
};

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const requestHeaders = await headers();
  const hostname = requestHeaders.get("host")?.split(":")[0] ?? "";
  const tenant = resolveTenant(hostname) ?? "tempus";
  const { name } = TENANTS[tenant];
  const config = TENANT_MANIFESTS[tenant];

  return {
    id: `/?tenant=${tenant}`,
    name: `${name} | Origo`,
    short_name: name,
    description: config.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: config.background_color,
    theme_color: config.theme_color,
    icons: [
      {
        src: `/${tenant}/icon.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
