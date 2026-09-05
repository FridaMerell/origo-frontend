import Link from "next/link"
import type { TempusRoute, TempusRouteStop, TempusSuggestedStop } from "@/app/lib/dal"
import { RouteMap } from "../rutt/route-map"
import { createRouteProjection } from "../rutt/projection"
import { CornerTicks } from "./corner-ticks"

export type HomeRouteOverview = {
  route: TempusRoute
  stops: TempusRouteStop[]
  suggestions: TempusSuggestedStop[]
}

function formatRouteDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
}

export function RouteOverview({ routeOverview }: { routeOverview: HomeRouteOverview | null }) {
  if (!routeOverview) {
    return (
      <section className="border border-border bg-surface">
        <div className="border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[.16em] text-text-faint">
          Nästa rutt
        </div>
        <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Ingen kommande rutt</h2>
            <p className="mt-1 text-base text-text-muted">
              Planera en tur så förs föreslagna arter och stopp längs vägen in här.
            </p>
          </div>
          <Link
            href="/rutt/ny"
            className="w-fit shrink-0 border border-accent px-3 py-2 text-base text-accent no-underline hover:bg-accent-wash"
          >
            Planera en rutt
          </Link>
        </div>
      </section>
    )
  }

  const { route, stops, suggestions } = routeOverview
  const markers = suggestions.slice(0, 3).map((stop) => ({
    id: `rank-${stop.rank}`,
    coordinates: stop.location.coordinates,
    label: stop.locality || `Förslag ${stop.rank}`,
    rank: stop.rank,
  }))

  // Fit the map viewport to the route itself instead of showing the whole
  // country. Both RouteMap layers share this projection, so we can project the
  // route's own points, take their bounding box, and derive a CSS transform
  // that frames it — deterministic, no eyeballed scale factors.
  const MAP_W = 400
  const MAP_H = 300
  const routeProjection = createRouteProjection(MAP_W, MAP_H, 0)
  const focusCoords: number[][] = []
  for (const position of route.geometry?.coordinates ?? []) {
    focusCoords.push([position[0], position[1]])
  }
  for (const stop of stops) {
    if (stop.location?.type === "Point") {
      focusCoords.push([stop.location.coordinates[0], stop.location.coordinates[1]])
    }
  }
  for (const stop of suggestions) {
    focusCoords.push([stop.location.coordinates[0], stop.location.coordinates[1]])
  }

  let mapTransform: string | undefined
  if (focusCoords.length > 0) {
    const points = focusCoords.map((position) => routeProjection.toMap(position))
    const xs = points.map((point) => point[0])
    const ys = points.map((point) => point[1])
    let minX = Math.min(...xs)
    let maxX = Math.max(...xs)
    let minY = Math.min(...ys)
    let maxY = Math.max(...ys)
    const marginX = (maxX - minX) * 0.35 + 36
    const marginY = (maxY - minY) * 0.35 + 36
    minX -= marginX
    maxX += marginX
    minY -= marginY
    maxY += marginY
    const boxW = maxX - minX
    const boxH = maxY - minY
    const scale = Math.max(1, Math.min(MAP_W / boxW, MAP_H / boxH))
    // Desired centring translate (fraction of the container), then clamp so the
    // scaled map always covers the frame — never exposes the backdrop.
    const clamp = (value: number) => Math.max(1 - scale, Math.min(0, value))
    const tx = clamp(((MAP_W - boxW * scale) / 2 - minX * scale) / MAP_W)
    const ty = clamp(((MAP_H - boxH * scale) / 2 - minY * scale) / MAP_H)
    mapTransform = `translate(${(tx * 100).toFixed(3)}%, ${(ty * 100).toFixed(3)}%) scale(${scale.toFixed(4)})`
  }

  return (
    <section className="border border-border bg-surface">
      <div className="border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[.16em] text-text-faint">
        Nästa rutt
      </div>
      <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)_20rem]">
        <div className="flex flex-col justify-between gap-6 p-5 lg:border-r lg:border-border">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">{route.name}</h2>
            <p className="mt-2 font-mono text-[11px] uppercase leading-relaxed tracking-[.13em] text-text-faint">
              {formatRouteDate(route.planned_date)}<br />
              {(route.corridor_metres / 1000).toLocaleString("sv-SE")} km korridor · {stops.length} stopp
            </p>
          </div>
          <Link
            href={`/rutt/${route.id}`}
            className="w-fit border-b border-accent pb-0.5 font-mono text-[10px] uppercase tracking-[.14em] text-accent no-underline"
          >
            Visa rutt ›
          </Link>
        </div>

        <div className="border-t border-border p-4 lg:border-t-0">
          <span className="block pb-2 font-mono text-[10px] uppercase tracking-[.16em] text-text-faint">
            Högst rankade längs vägen
          </span>
          {suggestions.length > 0 ? (
            <div className="border border-border">
              {suggestions.slice(0, 3).map((stop) => (
                <div
                  key={stop.rank}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border px-3 py-2.5 last:border-b-0"
                >
                  <span className="truncate font-display text-sm">{stop.locality || `Förslag ${stop.rank}`}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[.1em] tabular-nums text-text-muted">
                    {stop.species_count} arter · {Math.round(stop.detour_m)} m
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="border-t border-border pt-4 text-base text-text-muted">
              Kör en stoppanalys på ruttsidan för att hitta artrika platser längs vägen.
            </p>
          )}
        </div>

        <div className="relative min-h-56 overflow-hidden border-t border-border bg-surface-2/30 lg:border-l lg:border-t-0">
          <div
            className="absolute inset-0"
            style={{ transformOrigin: "0 0", transform: mapTransform }}
          >
            <RouteMap
              geometry={route.geometry}
              stops={stops}
              suggestions={markers}
              width={MAP_W}
              height={MAP_H}
              padding={0}
              frame={false}
              className="size-full [&_svg]:size-full!"
            />
          </div>
          <CornerTicks />
        </div>
      </div>
    </section>
  )
}
