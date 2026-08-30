"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import {
  createRouteStop,
  deleteRoute,
  deleteRouteStop,
  pollSuggestedStops,
  startSuggestedStops,
  type SuggestedStopsParams,
} from "@/app/actions/tempus"
import type { TempusSuggestedStopsRun } from "@/app/lib/dal"
import type {
  TempusRoute,
  TempusRouteStop,
  TempusSuggestedStop,
} from "@/app/lib/dal"
import { RouteMap, type RouteMapMarker } from "./route-map"

const RED_LIST_LABELS: Record<string, string> = {
  NT: "Nära hotad",
  VU: "Sårbar",
  EN: "Starkt hotad",
  CR: "Akut hotad",
  RE: "Nationellt utdöd",
  DD: "Kunskapsbrist",
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
}

function km(metres: number) {
  return `${(metres / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} km`
}

// Build a Google Maps directions URL for the route. Prefers the user's ordered
// stops; falls back to the raw polyline endpoints. Google caps the `waypoints`
// param at 9 intermediate points, so we evenly sample when there are more.
function googleMapsDirectionsUrl(
  route: TempusRoute,
  stops: TempusRouteStop[],
): string | null {
  const asLatLng = (coords: [number, number]) => `${coords[1]},${coords[0]}`

  let points: string[]
  if (stops.length > 0) {
    points = stops
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((stop) => asLatLng(stop.location.coordinates))
  } else {
    const line = route.geometry?.coordinates ?? []
    if (line.length < 2) return null
    points = line.map(asLatLng)
  }

  if (points.length < 2) return null

  const origin = points[0]
  const destination = points[points.length - 1]
  let middle = points.slice(1, -1)
  if (middle.length > 9) {
    const step = (middle.length - 1) / 9
    middle = Array.from({ length: 9 }, (_, i) => middle[Math.round(i * step)])
  }

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  })
  if (middle.length > 0) params.set("waypoints", middle.join("|"))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

function RedListMark({ category }: { category: string }) {
  if (!category) return null
  return (
    <span
      title={RED_LIST_LABELS[category] ?? category}
      className="ml-1.5 border-b border-danger font-mono text-[9px] not-italic uppercase tracking-wide text-danger"
    >
      {category}
    </span>
  )
}

function SuggestionEntry({
  stop,
  routeId,
  active,
  onFocus,
  onAdded,
}: {
  stop: TempusSuggestedStop
  routeId: string
  active: boolean
  onFocus: () => void
  onAdded: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const add = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await createRouteStop({
        route: routeId,
        name: stop.locality || `Stopp ${stop.rank}`,
        location: stop.location,
      })
      if (result.error) {
        setMessage(result.error)
        return
      }
      setMessage("Tillagd.")
      onAdded()
    })
  }

  return (
    <li
      className={`border-b border-border font-display ${active ? "bg-surface-2/40" : ""}`}
      onMouseEnter={onFocus}
    >
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_3.5rem]">
        <span className="flex items-start justify-end border-r border-border px-2 py-2.5 text-[13px] italic tabular-nums text-text-faint">
          {stop.rank}
        </span>
        <span className="min-w-0 border-r border-border px-3 py-2.5">
          <span className="block text-base italic tracking-wide">
            {stop.locality || "Namnlöst område"}
          </span>
          <span className="mt-0.5 block font-mono text-[9px] not-italic uppercase tracking-wide text-text-faint">
            {stop.county ? `${stop.county} · ` : ""}
            {stop.species_count} arter · {km(stop.distance_along_route_m)} in ·{" "}
            ≈{Math.round(stop.detour_m)} m från vägen (fågelväg)
          </span>
        </span>
        <span
          className="flex items-start justify-center px-1 py-2.5 text-sm italic tabular-nums text-text-muted"
          title="Poäng — artvariation och rariteter"
        >
          {stop.score.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}
        </span>
      </div>

      <div className="border-t border-border py-2.5 pl-[2.75rem] pr-3">
        {stop.highlights.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {stop.highlights.map((highlight) => (
              <li key={highlight.taxon_id} className="leading-5">
                <span className="text-[15px] italic tracking-wide">
                  {highlight.vernacular_name || highlight.scientific_name}
                </span>
                <span className="ml-1.5 text-[11px] italic text-text-muted">
                  {highlight.scientific_name}
                </span>
                <RedListMark category={highlight.red_list_category} />
                <span className="block text-xs italic text-text-muted">
                  {highlight.reason}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs italic text-text-muted">
            Inga utmärkande arter drev poängen här.
          </p>
        )}

        {stop.notable_recent.length > 0 ? (
          <div className="mt-2.5 border-l border-border pl-2.5">
            <p className="font-mono text-[9px] not-italic uppercase tracking-wide text-text-faint">
              Setts nyligen
            </p>
            <ul className="mt-1 flex flex-col gap-0.5 text-xs italic text-text-muted">
              {stop.notable_recent.map((entry, index) => (
                <li key={`${entry.scientific_name}-${index}`}>
                  {formatDate(entry.date)} ·{" "}
                  {entry.vernacular_name || entry.scientific_name}
                  {entry.locality ? ` · ${entry.locality}` : ""}
                  <RedListMark category={entry.red_list_category} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {expanded ? (
          <div className="mt-2.5 flex flex-col gap-2 text-xs italic text-text-muted">
            {stop.top_species.length > 0 ? (
              <p>
                <span className="font-mono text-[9px] not-italic uppercase tracking-wide text-text-faint">
                  Vanligast rapporterade:
                </span>{" "}
                {stop.top_species
                  .map(
                    (entry) =>
                      `${entry.vernacular_name || entry.scientific_name} (${entry.count})`,
                  )
                  .join(", ")}
              </p>
            ) : null}
            <p>
              <span className="font-mono text-[9px] not-italic uppercase tracking-wide text-text-faint">
                Poängkomponenter:
              </span>{" "}
              artrikedom {stop.breakdown.richness_term.toFixed(1)} · jämnhet{" "}
              {stop.breakdown.evenness_term.toFixed(1)} · raritet{" "}
              {stop.breakdown.rarity_term.toFixed(1)} · aktualitet{" "}
              {stop.breakdown.recency_term.toFixed(1)}
            </p>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Button type="button" size="sm" onClick={add} disabled={pending}>
            {pending ? "Lägger till…" : "Lägg till som stopp"}
          </Button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="font-display text-xs italic text-text-muted underline decoration-dotted underline-offset-2 hover:text-text"
          >
            {expanded ? "Dölj detaljer" : "Visa detaljer"}
          </button>
          {message ? (
            <span className="font-display text-xs italic text-text-muted">
              {message}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-l border-r border-border px-3 py-1.5 font-display text-[9px] italic text-text-faint">
      {children}
    </p>
  )
}

export default function RouteDetail({
  route,
  stops,
}: {
  route: TempusRoute
  stops: TempusRouteStop[]
}) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<TempusSuggestedStop[]>([])
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mutating, startMutation] = useTransition()

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelled = useRef(false)

  useEffect(
    () => () => {
      cancelled.current = true
      if (pollTimer.current) clearTimeout(pollTimer.current)
    },
    [],
  )

  const [sinceDays, setSinceDays] = useState(30)
  const [numStops, setNumStops] = useState(5)
  const [maxDetourKm, setMaxDetourKm] = useState("")

  const plannedDate = formatDate(route.planned_date)
  const routePoints = route.geometry?.coordinates.length ?? 0
  const mapsUrl = useMemo(
    () => googleMapsDirectionsUrl(route, stops),
    [route, stops],
  )

  const suggestionMarkers = useMemo<RouteMapMarker[]>(
    () =>
      suggestions.map((stop) => ({
        id: `rank-${stop.rank}`,
        coordinates: stop.location.coordinates,
        label: `${stop.rank}. ${stop.locality || "Område"}`,
        rank: stop.rank,
      })),
    [suggestions],
  )

  const notifyReady = (count: number) => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (Notification.permission !== "granted") return
    // Only worth a notification if the user has looked away while it ran.
    if (typeof document !== "undefined" && document.visibilityState === "visible") return
    new Notification("Stoppställen klara", {
      body: count
        ? `${count} förslag för ${route.name}`
        : `Inga stopp klarade ribban för ${route.name}`,
    })
  }

  const applyRun = (run: TempusSuggestedStopsRun) => {
    if (run.status === "succeeded") {
      setSuggestions(run.result)
      setLoading(false)
      notifyReady(run.result.length)
      return
    }
    if (run.status === "failed") {
      setError(run.error || "Sökningen misslyckades. Försök igen om en stund.")
      setSuggestions([])
      setLoading(false)
      return
    }
    // pending | running — keep polling
    pollTimer.current = setTimeout(async () => {
      if (cancelled.current) return
      const result = await pollSuggestedStops(route.id)
      if (cancelled.current) return
      if (result.error || !result.data) {
        setError(result.error ?? "Något gick fel.")
        setLoading(false)
        return
      }
      applyRun(result.data)
    }, 3000)
  }

  const runSearch = async () => {
    if (loading) return
    const retryAfterError = error !== null
    setError(null)
    setLoading(true)
    cancelled.current = false
    if (pollTimer.current) clearTimeout(pollTimer.current)

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission()
    }

    const params: SuggestedStopsParams = {
      since_days: sinceDays,
      num_stops: numStops,
      refresh: retryAfterError,
    }
    const detour = Number(maxDetourKm.replace(",", "."))
    if (maxDetourKm.trim() && Number.isFinite(detour) && detour >= 0) {
      params.max_detour_m = Math.round(detour * 1000)
    }

    const result = await startSuggestedStops(route.id, params)
    if (cancelled.current) return
    setSearched(true)
    if (result.error || !result.data) {
      setError(result.error ?? "Något gick fel.")
      setSuggestions([])
      setLoading(false)
      return
    }
    applyRun(result.data)
  }

  const removeStop = (stopId: string) => {
    startMutation(async () => {
      await deleteRouteStop(route.id, stopId)
      router.refresh()
    })
  }

  const removeRoute = () => {
    if (!window.confirm(`Ta bort rutten "${route.name}"?`)) return
    startMutation(async () => {
      const result = await deleteRoute(route.id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push("/rutt")
    })
  }

  return (
    <div className="container mx-auto max-w-4xl py-5 max-sm:px-3 sm:py-7">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <Link
          href="/rutt"
          className="font-mono text-[10px] uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent"
        >
          ‹ Rutter
        </Link>
        <div className="flex items-baseline gap-4">
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-muted hover:text-accent"
            >
              Öppna i Google Maps
            </a>
          ) : null}
          <button
            type="button"
            onClick={removeRoute}
            disabled={mutating}
            className="text-sm text-text-muted hover:text-danger disabled:opacity-50"
          >
            Ta bort
          </button>
        </div>
      </div>

      <article className="overflow-hidden rounded-card border border-border bg-surface text-text">
        <header className="px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
          <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
            <span>Ruttförteckning</span>
            <span>Blad {route.id.slice(0, 6).toUpperCase()}</span>
          </div>

          <div className="border-b border-border px-3 py-5 text-center sm:py-7">
            <h1 className="font-display text-3xl font-medium italic tracking-wide sm:text-4xl">
              {route.name}
            </h1>
            {plannedDate ? (
              <p className="mt-1.5 font-display text-sm italic text-text-muted">
                Planerad {plannedDate}
              </p>
            ) : null}
          </div>

          <dl className="grid border-l border-t border-border font-display sm:grid-cols-4">
            {[
              ["Planerad dag", plannedDate ?? "—"],
              ["Sökkorridor", km(route.corridor_metres)],
              ["Ruttpunkter", String(routePoints)],
              ["Stopp", stops.length ? String(stops.length) : "—"],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-r border-border px-3 py-2">
                <dt className="text-[9px] italic text-text-faint">{label}</dt>
                <dd className="mt-0.5 text-xs italic">{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className="px-3 pb-4 sm:px-5 sm:pb-6">
          <SectionRule>Ruttkarta</SectionRule>
          <div className="border-x border-b border-border bg-surface-2/20 px-3 py-4">
            <RouteMap
              geometry={route.geometry}
              stops={stops}
              suggestions={suggestionMarkers}
              activeId={activeId}
              frame={false}
              width={620}
              height={520}
              className="mx-auto max-w-lg"
            />
          </div>

          <SectionRule>Stopp längs rutten</SectionRule>
          {stops.length === 0 ? (
            <div className="border-x border-b border-border">
              {[0, 1, 2].map((line) => (
                <div
                  key={line}
                  className="grid h-10 grid-cols-[2.75rem_minmax(0,1fr)_2.5rem] border-b border-border last:border-b-0"
                >
                  <span className="border-r border-border" />
                  <span className="border-r border-border" />
                  <span />
                </div>
              ))}
              <p className="border-t border-border px-3 py-3 text-center font-display text-xs italic text-text-muted">
                Inga stopp än. Välj bland förslagen nedan.
              </p>
            </div>
          ) : (
            <ol className="border-x border-border font-display">
              {stops.map((stop, index) => (
                <li
                  key={stop.id}
                  className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.5rem] border-b border-border"
                >
                  <span className="flex items-center justify-end border-r border-border px-2 py-2.5 text-xs italic tabular-nums text-text-faint">
                    {stop.sequence || index + 1}
                  </span>
                  <span className="min-w-0 border-r border-border px-3 py-2.5 text-[15px] italic tracking-wide">
                    {stop.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStop(stop.id)}
                    disabled={mutating}
                    aria-label={`Ta bort ${stop.name}`}
                    className="font-display text-lg italic text-text-faint hover:bg-danger-wash hover:text-danger disabled:opacity-50"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}

          <SectionRule>Ruttanalys · Artdatabanken</SectionRule>
          <div className="border-x border-b border-border">
            <p className="border-b border-border px-3 py-3 text-center font-display text-sm italic text-text-muted">
              Stopp längs korridoren, rankade främst efter artvariation och
              rariteter
            </p>

            <div className="grid border-b border-l border-t border-border font-display sm:grid-cols-3">
              <label className="flex flex-col border-b border-r border-border px-3 py-2 text-[9px] italic text-text-faint">
                Observationsfönster
                <select
                  value={sinceDays}
                  onChange={(event) => setSinceDays(Number(event.target.value))}
                  className="mt-1 h-9 rounded border border-field-border bg-surface px-2 font-body text-xs not-italic text-text focus:border-accent focus:outline-none"
                >
                  {[7, 14, 30, 60, 90, 180, 365].map((days) => (
                    <option key={days} value={days}>
                      {days} dagar
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col border-b border-r border-border px-3 py-2 text-[9px] italic text-text-faint">
                Antal stopp
                <select
                  value={numStops}
                  onChange={(event) => setNumStops(Number(event.target.value))}
                  className="mt-1 h-9 rounded border border-field-border bg-surface px-2 font-body text-xs not-italic text-text focus:border-accent focus:outline-none"
                >
                  {[3, 5, 8, 10, 15, 25].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col border-b border-r border-border px-3 py-2 text-[9px] italic text-text-faint">
                Max avstickare (km)
                <input
                  inputMode="decimal"
                  value={maxDetourKm}
                  onChange={(event) => setMaxDetourKm(event.target.value)}
                  placeholder="valfritt"
                  className="mt-1 h-9 rounded border border-field-border bg-surface px-2.5 font-body text-xs not-italic text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </label>
            </div>

            <p className="border-b border-l border-border px-3 py-2 font-display text-[11px] not-italic leading-snug text-text-muted">
              Avstickare = punktens fågelvägsavstånd från ruttlinjen, aldrig mer
              än sökkorridoren ({km(route.corridor_metres)}). Filtret gör bara
              nytta när det är mindre än så — sätt det till hur långt från vägen
              du faktiskt orkar svänga. Det säger inget om huruvida en väg leder
              dit.
            </p>

            <div className="flex flex-wrap items-center gap-4 border-b border-border px-3 py-3">
              <Button type="button" onClick={runSearch} disabled={loading}>
                {loading ? "Söker längs rutten…" : "Sök stoppställen"}
              </Button>
              <span className="font-display text-xs italic text-text-faint">
                Direktsökning mot Artdatabanken — kan ta en stund.
              </span>
            </div>

            {error ? (
              <p
                className="border-b border-border bg-danger-wash px-3 py-2.5 font-display text-sm italic text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {loading ? (
              <p className="px-3 py-10 text-center font-display text-sm italic text-text-muted">
                Rankar stoppställen efter artvariation och rariteter…
              </p>
            ) : searched && suggestions.length === 0 && !error ? (
              <p className="px-3 py-10 text-center font-display text-sm italic text-text-muted">
                Inga stopp hittades inom sökkorridoren. Pröva ett större fönster
                eller en bredare korridor.
              </p>
            ) : suggestions.length > 0 ? (
              <ol className="border-t border-border">
                {suggestions.map((stop) => (
                  <SuggestionEntry
                    key={stop.rank}
                    stop={stop}
                    routeId={route.id}
                    active={activeId === `rank-${stop.rank}`}
                    onFocus={() => setActiveId(`rank-${stop.rank}`)}
                    onAdded={() => router.refresh()}
                  />
                ))}
              </ol>
            ) : null}
          </div>

          <p className="mt-2 text-right font-display text-[9px] italic text-text-faint">
            Punkterna är artrika platser, inte verifierade rastplatser.
          </p>
        </section>
      </article>
    </div>
  )
}
