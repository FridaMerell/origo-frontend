import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { fetchItem } from "@/app/lib/dal/client"
import {
  fetchTempusPage,
  type TempusListParams,
  type TempusPage,
} from "./shared"

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
