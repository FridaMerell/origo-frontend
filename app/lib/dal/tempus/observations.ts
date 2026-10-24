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
  // R2 paths under tempus/<user>/<taxon>/<observation>/, read through /api/files.
  // Each thumbnail lies beside its photo with "-thumb" before the extension.
  photos: string[]
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

// A locale's observations from every user.
export type TempusCategoryObservationsPage = TempusPage<TempusPublicObservation & { species_categories?: TempusObservationCategory[] }> & {
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

// Any user's observation, newest first. Carries no checklist data.
export type TempusPublicObservation = Omit<TempusObservation, "checklist_items" | "checklist_names" | "locale" | "species_categories"> & {
  username: string
  first_name: string
  last_name: string
}

export const getTempusAllObservationsPage = cache(
  async (params?: TempusListParams): Promise<TempusPage<TempusPublicObservation>> => {
    const query = paginationQuery(params, 8, 100)
    const page = await fetchTempusPage<TempusPublicObservation>(TEMPUS_ENDPOINTS.allObservations, query)
    return { ...page, pageSize: query.page_size }
  },
)

export const getTempusPublicObservationItem = cache(
  (id: string): Promise<TempusPublicObservation | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.allObservations}${id}/`)
)

export const getTempusObservationCategoryPage = cache(
  async (
    locale: string | number,
    params?: TempusListParams,
  ): Promise<TempusObservationCategoryPage> => {
    const query = paginationQuery({ ...params, locale }, 25, 100)
    const page = await fetchTempusPage<TempusObservationCategorySummary>(TEMPUS_ENDPOINTS.allObservationsByCategory, query)
    return { ...page, pageSize: query.page_size }
  },
)

// Every category the current user has observed species in, with counts.
export const getTempusObservedCategoryPage = cache(
  async (): Promise<TempusObservationCategoryPage> => {
    const query = paginationQuery(undefined, 100, 100)
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
      `${TEMPUS_ENDPOINTS.allObservationsByCategory}${encodeURIComponent(categoryId)}/${buildQuery(query)}`,
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

// The current user's year, in Swedish local time. Without observations that
// year only the totals (all zero) and `years` are present.
export type TempusYearSpecies = {
  id: string
  dyntaxa_taxon_id: number
  swedish_name: string
  scientific_name: string
  significance: number | null
  // Bare IUCN code (NT, VU, EN, CR, RE, DD), or "" when not red-listed.
  red_list_category: string
  observation_count: number
  first_observed_at: string
  // Never observed by the user before this year.
  is_new: boolean
  // The latest photo of the species this year, an R2 path.
  photo: string | null
}

export type TempusYearPhoto = {
  observation_id: string
  photo: string
  species_id: string
  swedish_name: string
  scientific_name: string
  observed_at: string
  locale_name: string | null
}

export type TempusYearPoint = { coordinates: [number, number]; locale_name: string | null }

export type TempusYearSummary = {
  year: number
  // Every year the user has observations in, newest first.
  years: number[]
  observation_count: number
  species_count: number
  locale_count: number
  months?: number[]
  first_observation?: {
    id: string
    species_id: string
    dyntaxa_taxon_id: number
    swedish_name: string
    scientific_name: string
    observed_at: string
    locale_name: string | null
  }
  // In the order they were first seen during the year.
  species?: TempusYearSpecies[]
  new_species_count?: number
  red_listed_count?: number
  rarest?: TempusYearSpecies | null
  // The most significant species' photos first, at most 12.
  photos?: TempusYearPhoto[]
  // Distinct observed positions.
  points?: [number, number][]
  extremes?: { south: TempusYearPoint; north: TempusYearPoint; distance_km: number } | null
  top_locale?: { id: number; name: string; observation_count: number } | null
}

export const getTempusYearSummary = cache(
  (year: number): Promise<TempusYearSummary | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.observationsYearSummary}${buildQuery({ year })}`)
)

export type TempusProfileSpecies = Omit<TempusYearSpecies, "is_new" | "photo">

// The current user's Tempus over all time. Without observations only the
// user, the totals (all zero), follows, planning and birdnet are present.
export type TempusProfile = {
  username: string
  first_name: string
  last_name: string
  date_joined: string
  observation_count: number
  species_count: number
  locale_count: number
  photo_count: number
  // Locales the user has drawn, observed in or not.
  own_locale_count: number
  follows: { follow_count: number; seen_count: number }
  planning: { checklist_count: number; item_count: number; observed_item_count: number; route_count: number }
  // null when the user has no BirdNET device.
  birdnet: { detection_count: number; species_count: number } | null
  // Every year with observations, newest first.
  years: { year: number; observation_count: number; species_count: number; new_species_count: number }[]
  first_observation?: NonNullable<TempusYearSummary["first_observation"]>
  red_listed_count?: number
  most_observed?: TempusProfileSpecies
  newest?: TempusProfileSpecies
  rarest?: TempusProfileSpecies | null
  // Observed species per primary category, the largest first.
  groups?: { id: string; label: string; taxon_id: number | null; species_count: number }[]
  // Observations per calendar month, all years together.
  months?: number[]
  top_locales?: { id: number; name: string; observation_count: number }[]
  extremes?: TempusYearSummary["extremes"]
}

export const getTempusProfile = cache(
  (): Promise<TempusProfile | null> => fetchItem(TEMPUS_ENDPOINTS.observationsProfile)
)

export const getTempusObservationItem = cache(
  (id: string): Promise<TempusObservation | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.observations}${id}/`)
)
