import { getTempusRoutes, getTempusRouteStops, getTempusSuggestedStopsRun } from "@/app/lib/dal/tempus/routes"
import type { HomeRouteOverview } from "./route-overview"

// The nearest planned route from today on, with its stops and suggested stops.
export async function getNextRouteOverview(): Promise<HomeRouteOverview | null> {
  const routes = await getTempusRoutes({ page_size: 100 })
  const todayKey = new Date().toISOString().slice(0, 10)
  const route = routes
    .filter((candidate) => candidate.planned_date >= todayKey)
    .sort((first, second) => first.planned_date.localeCompare(second.planned_date))[0]
  if (!route) return null

  const [stops, run] = await Promise.all([getTempusRouteStops(route.id), getTempusSuggestedStopsRun(route.id)])
  return { route, stops, suggestions: run?.status === "succeeded" ? run.result : [] }
}
