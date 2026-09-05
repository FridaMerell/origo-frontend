import type { Metadata } from "next"
import { cookies } from "next/headers"
import { TEMPUS_ALL_SWEDEN, TEMPUS_GEO_AREA_COOKIE } from "@/app/lib/config"
import {
  getTempusGeoAreas,
  getTempusRoutes,
  getTempusRouteStops,
  getTempusSeasonalOverviewPage,
  getTempusSuggestedStopsRun,
} from "@/app/lib/dal"
import { formatDateLong } from "@/app/lib/formatters"
import HomeView from "./home-view"

export const metadata: Metadata = {
  title: "Tempus | Origo",
  description: "Säsongsöversikt och ruttplanering.",
}
export default async function TempusPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; p?: string }>
}) {
  const { view: rawView, p: rawPage } = await searchParams
  const view = rawView === "all" ? "all" : "followed"
  const overviewPage = Number.isInteger(Number(rawPage)) && Number(rawPage) > 0
    ? Number(rawPage)
    : 1
  const [geoAreas, cookieStore, routes] = await Promise.all([
    getTempusGeoAreas(),
    cookies(),
    getTempusRoutes({ page_size: 100 }),
  ])
  const selectedId = cookieStore.get(TEMPUS_GEO_AREA_COOKIE)?.value
  const selectedGeoArea = selectedId === TEMPUS_ALL_SWEDEN
    ? null
    : geoAreas.find((geoArea) => geoArea.id === selectedId) ?? geoAreas[0] ?? null
  const todayKey = new Date().toISOString().slice(0, 10)
  const nextRoute = [...routes]
    .filter((route) => route.planned_date >= todayKey)
    .sort((first, second) => first.planned_date.localeCompare(second.planned_date))[0] ?? null

  const overviewParams = {
    geo_area: selectedGeoArea?.id,
    min_records: 20,
  }
  const emptyOverview = { results: [], count: 0, next: null, previous: null, pageSize: 0 }
  const routeOverview = nextRoute
    ? Promise.all([
        getTempusRouteStops(nextRoute.id),
        getTempusSuggestedStopsRun(nextRoute.id),
      ]).then(([stops, run]) => ({
        route: nextRoute,
        stops,
        suggestions: run?.status === "succeeded" ? run.result : [],
      }))
    : Promise.resolve(null)
  const [items, overview, overviewIncoming, overviewOutgoing, resolvedRouteOverview] = await Promise.all([
    view === "followed"
      ? getTempusSeasonalOverviewPage({
          ...overviewParams,
          is_followed: true,
          page_size: 100,
        })
      : Promise.resolve(emptyOverview),
    view === "all"
      ? getTempusSeasonalOverviewPage({
          ...overviewParams,
          page: overviewPage,
          page_size: 24,
        })
      : Promise.resolve(emptyOverview),
    view === "all"
      ? getTempusSeasonalOverviewPage({
          ...overviewParams,
          status: "coming_into_season",
          page_size: 3,
        })
      : Promise.resolve(emptyOverview),
    view === "all"
      ? getTempusSeasonalOverviewPage({
          ...overviewParams,
          status: "going_out_of_season",
          page_size: 3,
        })
      : Promise.resolve(emptyOverview),
    routeOverview,
  ])
  const today = new Date()

  return (
    <HomeView
      items={items.results}
      areaName={selectedGeoArea?.name ?? "Hela Sverige"}
      todayLabel={formatDateLong(today)}
      currentMonth={today.getMonth()}
      view={view}
      overview={overview.results}
      overviewCount={overview.count}
      overviewPage={overviewPage}
      overviewHasNext={Boolean(overview.next)}
      overviewHasPrevious={Boolean(overview.previous)}
      overviewIncoming={overviewIncoming.results}
      overviewOutgoing={overviewOutgoing.results}
      routeOverview={resolvedRouteOverview}
    />
  )
}
