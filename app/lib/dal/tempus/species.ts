import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { fetchItem } from "@/app/lib/dal/client"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import {
  fetchTempusPage,
  paginationQuery,
  type TempusListParams,
  type TempusPage,
} from "./shared"

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
  checklists?: TempusSpeciesChecklist[]
}

export type TempusSpeciesChecklist = {
  id: string
  item_id: string
  name: string
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
