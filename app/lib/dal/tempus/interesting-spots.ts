import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { buildQuery, fetchItem } from "@/app/lib/dal/client"

export type TempusInterestingSpot = {
  rank: number
  locality: string
  location: { type: "Point"; coordinates: [number, number] }
  distance_m: number
  municipality: string | null
  county: string | null
  score: number
  species_count: number
  highlights: unknown[]
  notable_recent: unknown[]
  top_species: unknown[]
}

export type TempusInterestingSpots = {
  point: { type: "Point"; coordinates: [number, number] }
  radius_m: number
  count: number
  spots: TempusInterestingSpot[]
}

export type TempusInterestingSpotsParams = {
  longitude: number
  latitude: number
  radius_m?: number
  taxon_id?: number
  since_days?: number
  notable_days?: number
  num_spots?: number
}

export const getTempusInterestingSpots = cache(
  (params: TempusInterestingSpotsParams): Promise<TempusInterestingSpots | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.interestingSpots}${buildQuery(params)}`),
)
