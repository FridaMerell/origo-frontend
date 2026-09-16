import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { buildQuery, fetchItem, fetchList } from "@/app/lib/dal/client"
import { fetchTempusPage, paginationQuery, type TempusListParams, type TempusPage } from "./shared"

// A field observation of a species, optionally tied to one or more checklist
// items it fulfils. The list endpoint returns the current user's observations
// only. Filter with `?species=` and `?checklist_items=`.
// GeoJSON Point ([longitude, latitude]) or `{}` when no position was recorded.
export type TempusObservationLocation =
  | { type: "Point"; coordinates: [number, number] }
  | Record<string, never>

// Read-only summary of the observed species, included alongside its Tempus ID.
export type TempusObservationSpeciesDetail = {
  dyntaxa_taxon_id: number
  swedish_name: string
}

export type TempusObservation = {
  id: string
  user: number
  species: string
  species_detail: TempusObservationSpeciesDetail
  checklist_items: string[]
  checklist_names: string[]
  locale: number | null
  observed_at: string
  location: TempusObservationLocation
  count: number | null
  life_stage: string
  notes: string
  created_at: string
  species_categories?: TempusObservationCategory[]
}

export type TempusObservationCategory = {
  id: string
  label: string
  taxon_id: number | null
  image_url: string | null
  is_primary: boolean
}

export type TempusObservationCategorySummary = {
  category: TempusObservationCategory
  obs_count: number
}

export type TempusObservationCategoryPage = TempusPage<TempusObservationCategorySummary>

export type TempusCategoryObservationsPage = TempusPage<TempusObservation> & {
  category: TempusObservationCategory | null
  obs_count: number
}

export const getTempusObservations = cache(
  (params?: TempusListParams): Promise<TempusObservation[]> =>
    fetchList(TEMPUS_ENDPOINTS.observations, params)
)

export const getTempusObservationsPage = cache(
  async (params?: TempusListParams): Promise<TempusPage<TempusObservation>> => {
    const query = paginationQuery(params, 25, 100)
    const page = await fetchTempusPage<TempusObservation>(TEMPUS_ENDPOINTS.observations, query)
    return { ...page, pageSize: query.page_size }
  },
)

export const getTempusObservationCategoryPage = cache(
  async (
    locale: string | number,
    params?: TempusListParams,
  ): Promise<TempusObservationCategoryPage> => {
    const query = paginationQuery({ ...params, locale }, 25, 100)
    const page = await fetchTempusPage<TempusObservationCategorySummary>(TEMPUS_ENDPOINTS.observationsByCategory, query)
    return { ...page, pageSize: query.page_size }
  },
)

export const getTempusCategoryObservationsPage = cache(
  async (
    categoryId: string,
    locale: string | number,
    params?: TempusListParams,
  ): Promise<TempusCategoryObservationsPage> => {
    const query = paginationQuery({ ...params, locale }, 8, 100)
    const response = await fetchItem<TempusCategoryObservationsPage>(
      `${TEMPUS_ENDPOINTS.observationsByCategory}${encodeURIComponent(categoryId)}/${buildQuery(query)}`,
    )
    if (!response || !Array.isArray(response.results)) {
      return { results: [], count: 0, next: null, previous: null, category: null, obs_count: 0, pageSize: query.page_size }
    }
    return {
      results: response.results,
      count: typeof response.count === "number" ? response.count : response.results.length,
      next: response.next ?? null,
      previous: response.previous ?? null,
      category: response.category ?? null,
      obs_count: typeof response.obs_count === "number" ? response.obs_count : response.results.length,
      pageSize: query.page_size,
    }
  },
)

export const getTempusObservationItem = cache(
  (id: string): Promise<TempusObservation | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.observations}${id}/`)
)
