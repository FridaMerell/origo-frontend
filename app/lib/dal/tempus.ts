import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import {
  buildQuery,
  fetchItem,
  fetchList,
  type QueryParams,
} from "@/app/lib/dal/client"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

// Tempus — a seasonal-nature planner. The taxa section reads the species
// catalogue (a flat Dyntaxa-backed list) and the curated species categories.
// A Dyntaxa landscape-type or biotope association. `code` is the single-letter
// Dyntaxa code, `significance` grades how strongly the species is tied to that
// habitat (observed values: "stor", "har").
export type TempusHabitat = {
  id: number
  code: string
  name: string
  significance: string
}

export type TempusSpecies = {
  id: string
  dyntaxa_taxon_id: number
  scientific_name: string
  swedish_name: string
  taxon_rank: string
  parent_dyntaxa_taxon_id: number | null
  is_active: boolean
  // Raw Dyntaxa taxon record — vernacular names, redlistCategory, category,
  // status, etc. Opaque; the UI does not read into it.
  api_data: Record<string, unknown> | null
  landscape_types: TempusHabitat[]
  biotopes: TempusHabitat[]
  synced_at: string | null
  created_at: string
  updated_at: string
  is_followed: boolean
}

type TempusGeoPosition = readonly [longitude: number, latitude: number, ...rest: number[]]

export type TempusGeoAreaGeometry =
  | {
      type: "Polygon"
      coordinates: readonly (readonly TempusGeoPosition[])[]
    }
  | {
      type: "MultiPolygon"
      coordinates: readonly (readonly (readonly TempusGeoPosition[])[])[]
    }

export type TempusGeoArea = {
  id: string
  name: string
  kind: "country" | "county" | "province" | "nature_reserve" | "biological_area"
  country_code: string
  geometry: TempusGeoAreaGeometry | null
}

export type TempusSpeciesCategory = {
  id: string
  label: string
  image_url: string
  is_primary: boolean
  parent_category?: string | null
  species: string[]
  species_memberships?: TempusSpeciesMembership[]
  species_count: number
  // Dyntaxa taxon the category is rooted at; passed to the taxon search as
  // `under_taxon_id` to scope hits to this branch of the tree.
  taxon_id: number | null
}

export type TempusSpeciesMembership = {
  id: string
  species: string
}

// A normalized taxon hit from the Dyntaxa-backed search endpoint. The Dyntaxa
// taxon id comes back as `taxon_id`; the register endpoint wants it under the
// key `dyntaxa_taxon_id`.
export type TempusTaxonHit = {
  taxon_id: number
  scientific_name: string
  swedish_name: string | null
  taxon_rank: string
}

// The phenogram is a Species-Observation-System-derived activity curve: 52
// weekly buckets plus a summary. `fraction` is the share of the year's records
// that fall in that week (0–1); `smoothed` is the same after the rolling mean.
// `activity_window` and the `*_day_of_year` envelope are the derived active
// period. Returned by the `phenogram/` detail action.
export type TempusPhenogramWeek = {
  week: number
  count: number
  smoothed: number
  fraction: number
}

// Where today sits in the curve, derived server-side from the day-of-year
// envelope. `status` is the single label; the booleans overlap (e.g. `at_peak`
// implies `is_in_season`).
export type TempusSeasonalStatus = {
  status:
    | "out_of_season"
    | "coming_into_season"
    | "in_season"
    | "at_peak"
    | "going_out_of_season"
  is_in_season: boolean
  is_coming_into_season: boolean
  is_going_out_of_season: boolean
  at_peak: boolean
  days_until_start: number | null
  days_until_end: number | null
}

export type TempusPhenogram = {
  id: string
  species: string
  geo_area: string | null
  years: number
  date_from: string
  date_to: string
  computed_at: string
  stale: boolean
  record_count: number
  record_limit_hit: boolean
  sample_count: number
  years_present: number
  smooth_weeks: number
  declustered: boolean
  peak_week: number
  activity_window: { start_week: number; end_week: number }
  start_day_of_year: number
  peak_start_day: number | null
  peak_end_day: number | null
  end_day_of_year: number
  confidence: number | null
  seasonal_status: TempusSeasonalStatus
  weeks: TempusPhenogramWeek[]
}

// Lightweight, paginated home-feed payload. It deliberately contains the
// season summary needed for discovery without sending all 52 weekly buckets
// for every species.
export type TempusSeasonalOverview = {
  id: string
  dyntaxa_taxon_id: number
  scientific_name: string
  swedish_name: string
  is_followed: boolean
  record_count: number
  seasonal_status: TempusSeasonalStatus
  activity_window: { start_week: number; end_week: number }
  peak_week: number
  habitats: string[]
  landscape_types: TempusHabitat[]
  confidence: number | null
}

// A planned species checklist for an outing, inventory or area. Created via the
// `createChecklist` action, which POSTs the checklist then its items. The list
// endpoint may return `geo_area`/`route` as ids or as nested objects depending
// on the serializer; the UI reads `geo_area_name` when present and falls back.
export type TempusChecklistItem = {
  id: string
  checklist: string
  species: string
  sequence: number
  notes: string
}

export type TempusChecklistRegisterRow = {
  id: string
  sequence: number
  notes: string
  species_id: string
  swedish_name: string
  scientific_name: string
  dyntaxa_taxon_id: number
  is_observed: boolean
  latest_observation_id: string | null
}

export type TempusChecklist = {
  id: string
  name: string
  description: string
  start_date: string | null
  end_date: string | null
  geo_area: string | null
  geo_area_name?: string | null
  route: string | null
  species_count?: number
  item_count?: number
  items?: TempusChecklistItem[]
  created_by?: string | null
  created_at: string
  updated_at: string
}

// A field observation of a species, optionally tied to one or more checklist
// items it fulfils. The list endpoint returns the current user's observations
// only. Filter with `?species=` and `?checklist_items=`.
// GeoJSON Point ([longitude, latitude]) or `{}` when no position was recorded.
export type TempusObservationLocation =
  | { type: "Point"; coordinates: [number, number] }
  | Record<string, never>

export type TempusObservation = {
  id: string
  user: number
  species: string
  checklist_items: string[]
  checklist_names: string[]
  observed_at: string
  location: TempusObservationLocation
  count: number | null
  notes: string
  created_at: string
}

// A planned driving route. `geometry` is the full polyline from a routing
// provider (GeoJSON LineString, [lon, lat], WGS84). `corridor_metres` is the
// half-width searched either side of the line for rest-stop suggestions.
export type TempusRouteGeometry = {
  type: "LineString"
  coordinates: [number, number][]
}

export type TempusRoute = {
  id: string
  user: string
  name: string
  planned_date: string
  geometry: TempusRouteGeometry | null
  corridor_metres: number
  created_at: string
  updated_at: string
}

// A user-authored ordered stop along a route (distinct from the ranked
// suggestions below). `sequence` is unique per route.
export type TempusRouteStop = {
  id: string
  route: string
  sequence: number
  name: string
  location: { type: "Point"; coordinates: [number, number] }
  planned_at: string | null
}

// Rest-stop suggestions — ranked points along the route corridor, scored by
// species variety + rarity. Live, uncached call to the Artdatabanken API.
export type TempusStopHighlight = {
  taxon_id: number
  scientific_name: string
  vernacular_name: string
  count: number
  last_seen_days: number | null
  red_list_category: string
  reason: string
}

export type TempusStopNotable = {
  scientific_name: string
  vernacular_name: string
  date: string
  locality: string
  red_list_category: string
}

export type TempusStopTopSpecies = {
  scientific_name: string
  vernacular_name: string
  count: number
}

export type TempusSuggestedStop = {
  rank: number
  score: number
  breakdown: {
    richness_term: number
    evenness_term: number
    rarity_term: number
    recency_term: number
    corrected_richness: number
  }
  location: { type: "Point"; coordinates: [number, number] }
  locality: string
  county: string
  species_count: number
  highlights: TempusStopHighlight[]
  notable_recent: TempusStopNotable[]
  top_species: TempusStopTopSpecies[]
  distance_along_route_m: number
  detour_m: number
}

// The computation runs in a background worker (dozens of rate-limited external
// calls), so callers start it with POST and then poll GET until `status` is
// "succeeded" (read `result`) or "failed" (show `error`). There is one run per
// route; starting a new one replaces the previous result.
export type TempusSuggestedStopsRunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"

export type TempusSuggestedStopsRun = {
  route: string
  status: TempusSuggestedStopsRunStatus
  params: Record<string, unknown>
  result: TempusSuggestedStop[]
  error: string
  created_at: string
  started_at: string | null
  finished_at: string | null
}

export type TempusListParams = QueryParams

export type TempusPage<T> = {
  results: T[]
  count: number
  next: string | null
  previous: string | null
  pageSize?: number
}

function isPaginatedEnvelope<T>(body: unknown): body is TempusPage<T> {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { results?: unknown }).results)
  )
}

export async function fetchTempusPage<T>(
  path: string,
  params?: TempusListParams
): Promise<TempusPage<T>> {
  const empty: TempusPage<T> = { results: [], count: 0, next: null, previous: null }

  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return empty

  const response = await fetchOrigoApi(`${path}${buildQuery(params)}`, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  if (!response.ok) return empty

  const body: unknown = await response.json()
  if (isPaginatedEnvelope<T>(body)) {
    return {
      results: body.results,
      count: typeof body.count === "number" ? body.count : body.results.length,
      next: body.next ?? null,
      previous: body.previous ?? null,
    }
  }

  const results = Array.isArray(body) ? (body as T[]) : []
  return { results, count: results.length, next: null, previous: null }
}

function paginationQuery(
  params: TempusListParams | undefined,
  defaultPageSize: number,
  maxPageSize: number
): TempusListParams & { page: number; page_size: number; limit: number; offset: number } {
  const requestedPage = Number(params?.page)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const requestedPageSize = Number(params?.page_size)
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
    ? Math.min(requestedPageSize, maxPageSize)
    : defaultPageSize

  return {
    ...params,
    page,
    page_size: pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }
}

export const getTempusSpecies = cache(
  async (params?: TempusListParams): Promise<TempusSpecies[]> =>
    (await getTempusSpeciesPage(params)).results
)

export const getTempusSpeciesPage = cache(
  async (params?: TempusListParams): Promise<TempusPage<TempusSpecies>> => {
    const query = paginationQuery(params, 25, 50)
    const page = await fetchTempusPage<TempusSpecies>(TEMPUS_ENDPOINTS.species, query)
    return { ...page, pageSize: query.page_size }
  }
)

export const getTempusChecklists = cache(
  (params?: TempusListParams): Promise<TempusChecklist[]> =>
    fetchList(TEMPUS_ENDPOINTS.checklists, params)
)

export const getTempusChecklistItem = cache(
  (id: string): Promise<TempusChecklist | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.checklists}${id}/`)
)

export const getTempusChecklistItems = cache(
  (checklistId: string): Promise<TempusChecklistItem[]> =>
    fetchList(TEMPUS_ENDPOINTS.checklistItems, { checklist: checklistId })
)

export const getTempusChecklistRegisterPage = cache(
  async (
    checklistId: string,
    params?: TempusListParams,
  ): Promise<TempusPage<TempusChecklistRegisterRow>> => {
    const query = paginationQuery(params, 250, 250)
    const page = await fetchTempusPage<TempusChecklistRegisterRow>(
      TEMPUS_ENDPOINTS.checklistRegister(checklistId),
      query,
    )
    return { ...page, pageSize: query.page_size }
  },
)

export const getTempusObservations = cache(
  (params?: TempusListParams): Promise<TempusObservation[]> =>
    fetchList(TEMPUS_ENDPOINTS.observations, params)
)

export const getTempusObservationItem = cache(
  (id: string): Promise<TempusObservation | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.observations}${id}/`)
)

export const getTempusGeoAreas = cache(
  (params?: TempusListParams): Promise<TempusGeoArea[]> =>
    fetchList(TEMPUS_ENDPOINTS.geoAreas, params)
)

export const getTempusSpeciesItem = cache(
  (id: string): Promise<TempusSpecies | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.species}${id}/`)
)

export async function getTempusSpeciesItems(ids: Iterable<string>): Promise<TempusSpecies[]> {
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length === 0) return []

  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return []

  const batches = Array.from(
    { length: Math.ceil(uniqueIds.length / 100) },
    (_, index) => uniqueIds.slice(index * 100, (index + 1) * 100),
  )
  const speciesById = new Map<string, TempusSpecies>()
  let nextBatch = 0

  const resolveBatch = async (batch: string[]) => {
    try {
      const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesResolve, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken ?? "",
          Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
        },
        body: JSON.stringify({ ids: batch }),
      })
      if (!response.ok) return []

      const body: unknown = await response.json().catch(() => [])
      return Array.isArray(body) ? (body as TempusSpecies[]) : []
    } catch {
      return []
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(4, batches.length) }, async () => {
      while (nextBatch < batches.length) {
        const batchIndex = nextBatch
        nextBatch += 1
        for (const species of await resolveBatch(batches[batchIndex])) {
          speciesById.set(species.id, species)
        }
      }
    }),
  )

  return uniqueIds
    .map((id) => speciesById.get(id))
    .filter((species): species is TempusSpecies => species !== undefined)
}

export const getTempusSpeciesCategories = cache(
  async (params?: TempusListParams): Promise<TempusSpeciesCategory[]> =>
    (await getTempusSpeciesCategoriesPage(params)).results
)

export const getTempusSpeciesCategoriesAll = cache(
  async (): Promise<TempusSpeciesCategory[]> => {
    const categories: TempusSpeciesCategory[] = []
    let page = 1
    while (true) {
      const categoryPage = await getTempusSpeciesCategoriesPage({ page, page_size: 50 })
      categories.push(...categoryPage.results)
      if (!categoryPage.next) break
      page += 1
    }
    return categories
  }
)

export const getTempusSpeciesCategoriesPage = cache(
  async (params?: TempusListParams): Promise<TempusPage<TempusSpeciesCategory>> => {
    const query = paginationQuery(params, 24, 50)
    const page = await fetchTempusPage<TempusSpeciesCategory>(
      TEMPUS_ENDPOINTS.speciesCategories,
      query
    )
    return { ...page, pageSize: query.page_size }
  }
)

export const getTempusSpeciesCategoryItem = cache(
  (id: string): Promise<TempusSpeciesCategory | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.speciesCategories}${id}/`)
)

export const getTempusSpeciesCategoryByTaxonId = cache(
  async (taxonId: string): Promise<TempusSpeciesCategory | null> => {
    const page = await fetchTempusPage<TempusSpeciesCategory>(
      TEMPUS_ENDPOINTS.speciesCategories,
      { taxon_id: taxonId }
    )
    return page.results[0] ?? null
  }
)

export const getTempusSpeciesPhenogram = cache(
  (id: string, geoArea?: string): Promise<TempusPhenogram | null> => {
    const search = geoArea ? `?${new URLSearchParams({ geo_area: geoArea })}` : ""
    return fetchItem(`${TEMPUS_ENDPOINTS.speciesPhenogram(id)}${search}`)
  }
)

export const getTempusSeasonalOverviewPage = cache(
  async (params?: TempusListParams): Promise<TempusPage<TempusSeasonalOverview>> => {
    const query = paginationQuery(params, 24, 50)
    const page = await fetchTempusPage<TempusSeasonalOverview>(
      TEMPUS_ENDPOINTS.speciesSeasonalOverview,
      query,
    )
    return { ...page, pageSize: query.page_size }
  },
)

export const getTempusRoutesPage = cache(
  (params?: TempusListParams): Promise<TempusPage<TempusRoute>> =>
    fetchTempusPage<TempusRoute>(TEMPUS_ENDPOINTS.routes, params)
)

export const getTempusRoutes = cache(
  async (params?: TempusListParams): Promise<TempusRoute[]> =>
    (await getTempusRoutesPage(params)).results
)

export const getTempusRouteItem = cache(
  (id: string): Promise<TempusRoute | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.routes}${id}/`)
)

export const getTempusSuggestedStopsRun = cache(
  (routeId: string): Promise<TempusSuggestedStopsRun | null> =>
    fetchItem(TEMPUS_ENDPOINTS.routeSuggestedStops(routeId))
)

export const getTempusRouteStops = cache(
  async (routeId: string): Promise<TempusRouteStop[]> => {
    const page = await fetchTempusPage<TempusRouteStop>(TEMPUS_ENDPOINTS.routeStops, {
      route: routeId,
      page_size: 200,
    })
    return [...page.results].sort((a, b) => a.sequence - b.sequence)
  }
)

export const getTempusSpeciesByCategory = cache(
  async (taxonId: string, params?: TempusListParams): Promise<TempusSpecies[]> =>
    (await getTempusSpeciesPageByCategory(taxonId, params)).results
)

export const getTempusSpeciesPageByCategory = cache(
  async (
    taxonId: string,
    params?: TempusListParams
  ): Promise<TempusPage<TempusSpecies>> => {
    const query = paginationQuery(params, 25, 50)
    const page = await fetchTempusPage<TempusSpecies>(TEMPUS_ENDPOINTS.species, {
      ...query,
      categories__taxon_id: taxonId,
    })
    return {
      ...page,
      pageSize: query.page_size,
    }
  }
)
