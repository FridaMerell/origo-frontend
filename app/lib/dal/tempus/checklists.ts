import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { fetchItem, fetchList } from "@/app/lib/dal/client"
import {
  fetchTempusPage,
  paginationQuery,
  type TempusListParams,
  type TempusPage,
} from "./shared"

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
