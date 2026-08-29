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
  species: string[]
  species_count: number
  // Dyntaxa taxon the category is rooted at; passed to the taxon search as
  // `under_taxon_id` to scope hits to this branch of the tree.
  taxon_id: number | null
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
  observed_at: string
  location: TempusObservationLocation
  count: number | null
  notes: string
  created_at: string
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

export const getTempusSpecies = cache(
  (params?: TempusListParams): Promise<TempusSpecies[]> =>
    fetchList(TEMPUS_ENDPOINTS.species, params)
)

export const getTempusSpeciesPage = cache(
  (params?: TempusListParams): Promise<TempusPage<TempusSpecies>> =>
    fetchTempusPage(TEMPUS_ENDPOINTS.species, params)
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

export const getTempusSpeciesCategories = cache(
  (params?: TempusListParams): Promise<TempusSpeciesCategory[]> =>
    fetchList(TEMPUS_ENDPOINTS.speciesCategories, params)
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

export const getTempusSpeciesByCategory = cache(
  (taxonId: string, params?: TempusListParams): Promise<TempusSpecies[]> =>
    fetchList(TEMPUS_ENDPOINTS.species, {
      ...params,
      categories__taxon_id: taxonId,
    })
)

export const getTempusSpeciesPageByCategory = cache(
  async (
    taxonId: string,
    params?: TempusListParams
  ): Promise<TempusPage<TempusSpecies>> => {
    const requestedPageSize = Number(params?.page_size)
    const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? requestedPageSize
      : 25
    const page = await fetchTempusPage<TempusSpecies>(TEMPUS_ENDPOINTS.species, {
      page_size: pageSize,
      ...params,
      categories__taxon_id: taxonId,
    })
    return {
      ...page,
      pageSize,
    }
  }
)
