import type { Metadata } from "next"
import { cookies } from "next/headers"
import { TEMPUS_ALL_SWEDEN, TEMPUS_GEO_AREA_COOKIE } from "@/app/lib/config"
import { getCurrentUser } from "@/app/lib/dal/auth"
import { getTempusGeoAreas } from "@/app/lib/dal/tempus/geo"
import { formatDateLong } from "@/app/lib/formatters"
import HomeView from "./home-view"
import { areaPosition } from "./home/area-position"
import { getNextRouteOverview } from "./home/next-route"
import { OverviewProvider } from "./home/overview-provider"
import { overviewResources } from "./home/resources"
import { RouteOverview, formatRouteDate } from "./home/route-overview"
import { readSeed } from "./home/seed"
import { parseSelection } from "./home/selection"

export const metadata: Metadata = {
  title: "Tempus | Origo",
  description: "Säsongsöversikt och ruttplanering.",
}

// ISO week: the week that holds the year's first Thursday is week 1.
function isoWeek(date: Date) {
  const thursday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7))
  return Math.ceil(((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)
}

export default async function TempusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Nothing that can start without the area list waits for it.
  const geoAreasRequest = getTempusGeoAreas()
  const routeRequest = getNextRouteOverview()
  const [params, user, cookieStore] = await Promise.all([searchParams, getCurrentUser(), cookies()])
  const isGuest = !user
  const selection = parseSelection((name) => [params[name]].flat()[0], isGuest)
  const seedFor = (geoAreaId: string | null) => readSeed(selection, overviewResources(geoAreaId))

  // With an area already chosen (or "all of Sweden") the overview starts at once,
  // alongside the area list; only a first visit has to wait for the list's default.
  const storedId = cookieStore.get(TEMPUS_GEO_AREA_COOKIE)?.value
  const earlyAreaId = storedId && storedId !== TEMPUS_ALL_SWEDEN ? storedId : null
  const earlySeed = storedId ? seedFor(earlyAreaId) : null
  const geoAreas = await geoAreasRequest
  const geoArea = storedId === TEMPUS_ALL_SWEDEN
    ? null
    : geoAreas.find((candidate) => candidate.id === storedId) ?? geoAreas[0] ?? null
  const geoAreaId = geoArea?.id ?? null
  // A stored area that no longer exists falls back to the default.
  const [seed, route] = await Promise.all([
    earlySeed && geoAreaId === earlyAreaId ? earlySeed : seedFor(geoAreaId),
    routeRequest,
  ])
  const today = new Date()

  return (
    <OverviewProvider geoAreaId={geoAreaId} isGuest={isGuest} seed={seed}>
      <HomeView
        areaName={geoArea?.name ?? "Hela Sverige"}
        position={areaPosition(geoArea?.geometry ?? null)}
        todayLabel={formatDateLong(today)}
        week={isoWeek(today)}
        currentMonth={today.getMonth()}
        route={<RouteOverview routeOverview={route} />}
        nextRoute={route ? { name: route.route.name, date: formatRouteDate(route.route.planned_date) } : null}
      />
    </OverviewProvider>
  )
}
