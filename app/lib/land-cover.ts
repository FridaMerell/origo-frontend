import { TEMPUS_ENDPOINTS } from "@/app/lib/config"

export type GeoPosition = readonly [longitude: number, latitude: number]
export type GeoPolygon = { type: "Polygon"; coordinates: readonly (readonly GeoPosition[])[] }
export type GeoMultiPolygon = { type: "MultiPolygon"; coordinates: readonly (readonly (readonly GeoPosition[])[])[] }
export type GeoGeometry = GeoPolygon | GeoMultiPolygon

export type LandCoverFeature = {
  collection: string
  feature_id: string | number | null
  // Top-level on the feature itself per the backend contract — not nested
  // under `properties`. Optional because not every endpoint's features carry
  // it (e.g. the point-lookup's own `land_cover`/`wetland` fields already
  // convey this without repeating it per-feature).
  kind?: "land_cover" | "wetland"
  properties: Record<string, unknown>
}

export type LandCoverLookup = {
  locale: number
  point: { type: "Point"; coordinates: readonly [number, number] }
  land_cover: LandCoverFeature | null
  wetland: LandCoverFeature | null
  features: LandCoverFeature[]
}

export type LandCoverMapFeature = LandCoverFeature & {
  geometry: GeoPolygon | GeoMultiPolygon
}

export type LandCoverMapLayer = {
  locale?: number
  type: "FeatureCollection"
  features: LandCoverMapFeature[]
}

export type LandCoverTierName = "full" | "summary" | "overview"
export type LandCoverTier = { type: "FeatureCollection"; features: LandCoverMapFeature[] }

// Viewport land-cover responses are wrapped in a resolution "tier" (how
// detailed the geometry is: full/summary/overview) plus which upstream
// produced it (`source`) — orthogonal to each other. Exactly one tier key is
// present per response; which one depends on viewport size and upstream
// availability.
export type TieredViewportLandCoverResponse = {
  source: "lantmateriet" | "corine"
  tiers: Partial<Record<LandCoverTierName, LandCoverTier>>
}

// The full (non-degraded) viewport layer is still returned as a plain
// GeoJSON FeatureCollection — only the degraded path was restructured into
// the tiered/`source` shape. Accept both rather than assuming every response
// looks like the degraded example.
export type ViewportLandCoverResponse = TieredViewportLandCoverResponse | LandCoverTier

export type ResolvedLandCoverTier = {
  tier: LandCoverTierName
  source: "lantmateriet" | "corine"
  degraded: boolean
  features: LandCoverMapFeature[]
}

export function resolveLandCoverTier(response: ViewportLandCoverResponse | null): ResolvedLandCoverTier | null {
  if (!response) return null
  if (!("tiers" in response)) return { tier: "full", source: "lantmateriet", degraded: false, features: response.features }
  const entry = Object.entries(response.tiers)[0] as [LandCoverTierName, LandCoverTier] | undefined
  if (!entry) return null
  const [tier, collection] = entry
  return { tier, source: response.source, degraded: tier !== "full", features: collection.features }
}

export type AdministrativeBoundariesResponse = {
  bbox?: readonly [number, number, number, number]
  type: "FeatureCollection"
  features: LandCoverMapFeature[]
}

export type CountryOverviewResponse = {
  basemap: {
    provider: "OpenFreeMap"
    style_url: string
    initial_view: { center: readonly [number, number]; zoom: number }
  }
  outline: { type: "Feature"; properties: { kind: "country" }; geometry: GeoGeometry }
  waterways: {
    type: "FeatureCollection"
    features: { type: "Feature"; properties: { kind: "lake" | "river"; objekttyp?: string }; geometry: GeoGeometry }[]
  }
  land_cover?: {
    source: "schematic"
    tiers: { overview: LandCoverTier }
  }
  cities: { name: string; coordinates: readonly [number, number] }[]
}

export class LandCoverLookupError extends Error {
  constructor(readonly status?: number, readonly retryAfterSeconds?: number) {
    super("Land-cover lookup failed")
  }
}

async function fetchAuthenticatedTempus<T>(
  resource: string,
  params: URLSearchParams = new URLSearchParams(),
  signal?: AbortSignal,
): Promise<T> {
  params.set("resource", resource)
  const response = await fetch(`/api/tempus/geo?${params}`, { credentials: "include", signal })
  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After")
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined
    throw new LandCoverLookupError(response.status, Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined)
  }
  return response.json() as Promise<T>
}

export async function lookupLocaleLandCover(
  localeId: number,
  coordinates: readonly [number, number],
  signal?: AbortSignal,
): Promise<LandCoverLookup> {
  const params = new URLSearchParams({ locale: String(localeId), longitude: String(coordinates[0]), latitude: String(coordinates[1]) })
  return fetchAuthenticatedTempus<LandCoverLookup>("locale-land-cover", params, signal)
}

export function getLocaleLandCoverMap(localeId: number, signal?: AbortSignal) {
  return fetchAuthenticatedTempus<LandCoverMapLayer>("locale-land-cover-map", new URLSearchParams({ locale: String(localeId) }), signal)
}

export function getLocaleAdministrativeBoundaries(localeId: number, signal?: AbortSignal) {
  return fetchAuthenticatedTempus<LandCoverMapLayer>("locale-administrative-boundaries", new URLSearchParams({ locale: String(localeId) }), signal)
}

export function getCountryOverview(signal?: AbortSignal) {
  return fetchAuthenticatedTempus<CountryOverviewResponse>("country-overview", new URLSearchParams(), signal)
}

export function getViewportLandCover(
  bbox: readonly [number, number, number, number],
  options: { kinds?: readonly ("land_cover" | "wetland")[]; signal?: AbortSignal } = {},
) {
  const params = new URLSearchParams({ bbox: bbox.join(",") })
  if (options.kinds?.length) params.set("kinds", options.kinds.join(","))
  return fetchAuthenticatedTempus<ViewportLandCoverResponse>("land-cover", params, options.signal)
}

export const SWEDEN_BBOX = [10.5, 55.0, 24.2, 69.1] as const

export function getViewportAdministrativeBoundaries(
  bbox: readonly [number, number, number, number],
  options: { kinds?: readonly ("municipality" | "county" | "country")[]; signal?: AbortSignal } = {},
) {
  const params = new URLSearchParams({ bbox: bbox.join(",") })
  if (options.kinds?.length) params.set("kinds", options.kinds.join(","))
  return fetchAuthenticatedTempus<AdministrativeBoundariesResponse>("administrative-boundaries", params, options.signal)
}
