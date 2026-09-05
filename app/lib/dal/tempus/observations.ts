import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { fetchItem, fetchList } from "@/app/lib/dal/client"
import type { TempusListParams } from "./shared"

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

export const getTempusObservations = cache(
  (params?: TempusListParams): Promise<TempusObservation[]> =>
    fetchList(TEMPUS_ENDPOINTS.observations, params)
)

export const getTempusObservationItem = cache(
  (id: string): Promise<TempusObservation | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.observations}${id}/`)
)
