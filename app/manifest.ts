import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { resolveTenant, TENANTS, type TenantId } from "@/app/lib/tenant"

// One manifest route served per subdomain tenant. `headers()` makes this
// dynamic, so verso/flux/tempus/apsis each get their own name, colours and
// icons while sharing a single `/manifest.webmanifest` endpoint.

type TenantManifest = {
  description: string
  background_color: string
  theme_color: string
  // Separate maskable icon when the motif needs more scale than icon.png gives.
  maskable_icon?: string
}

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
    maskable_icon: "/flux/icon-maskable.png",
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
  opus: {
    description: "Opus - Origo",
    background_color: "#f5ecda",
    theme_color:'#6d0d35'
  },
  caelus: {
    description: "Caelus – Origo",
    background_color: "#eceae3",
    theme_color: "#1d1f33",
  },

}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const requestHeaders = await headers()
  const hostname = requestHeaders.get("host")?.split(":")[0] ?? ""
  const tenant = resolveTenant(hostname)

  // No tenant subdomain (the Origo root landing page): describe Origo itself
  // with the root app/icon.png instead of falling back to Tempus.
  if (tenant === null) {
    return {
      id: "/",
      name: "Origo",
      short_name: "Origo",
      description: "Origo",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#FAF8EF",
      theme_color: "#A4410D",
      icons: [
        {
          src: "/icon.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    }
  }

  const { name } = TENANTS[tenant]
  const config = TENANT_MANIFESTS[tenant]

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
      {
        src: config.maskable_icon ?? `/${tenant}/icon.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
