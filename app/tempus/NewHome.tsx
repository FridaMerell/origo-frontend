import Link from "next/link"
import type {
  TempusPhenogram,
  TempusSeasonalOverview,
  TempusSeasonalStatus,
  TempusSpecies,
  TempusRoute,
  TempusRouteStop,
  TempusSuggestedStop,
} from "@/app/lib/dal"
import { BiotopeMap } from "./ui/biotope-map"
import { biotopePropsFromSpecies } from "./ui/biotope-map/BiotopeMap"
import { RouteMap } from "./rutt/route-map"
import { createRouteProjection } from "./rutt/projection"

export type HomeSpecies = { species: TempusSpecies; phenogram: TempusPhenogram | null }
export type HomeRouteOverview = {
  route: TempusRoute
  stops: TempusRouteStop[]
  suggestions: TempusSuggestedStop[]
}

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

const STATUS_META: Record<
  TempusSeasonalStatus["status"],
  { label: string; ink: string; rank: number }
> = {
  at_peak: { label: "Toppsäsong", ink: "text-accent", rank: 0 },
  in_season: { label: "I säsong", ink: "text-accent", rank: 1 },
  coming_into_season: { label: "På väg in", ink: "text-secondary", rank: 2 },
  going_out_of_season: { label: "På väg ut", ink: "text-warning", rank: 3 },
  out_of_season: { label: "Utanför säsong", ink: "text-text-faint", rank: 4 },
}

const speciesName = (species: TempusSpecies) =>
  species.swedish_name?.trim() || species.scientific_name?.trim() || "Okänd art"
const weekToMonth = (week: number) => Math.min(11, Math.floor(((week - 1) * 12) / 52))

function activeMonthsForWindow({ start_week: start, end_week: end }: { start_week: number; end_week: number }) {
  const weeks = start <= end
    ? Array.from({ length: end - start + 1 }, (_, index) => start + index)
    : [...Array.from({ length: 53 - start }, (_, index) => start + index), ...Array.from({ length: end }, (_, index) => index + 1)]
  return new Set(weeks.map(weekToMonth))
}

function activeMonths(phenogram: TempusPhenogram | null) {
  return phenogram?.activity_window ? activeMonthsForWindow(phenogram.activity_window) : new Set<number>()
}

function habitatSummary(species: TempusSpecies) {
  const habitats = [...(species.landscape_types ?? []), ...(species.biotopes ?? [])]
    .sort((first, second) => {
      const significance = { stor: 0, har: 1 }
      return (significance[first.significance as keyof typeof significance] ?? 2) - (significance[second.significance as keyof typeof significance] ?? 2) || first.name.localeCompare(second.name, "sv")
    })
    .map((habitat) => habitat.name)
  return [...new Set(habitats)].slice(0, 3).join(" · ") || "Livsmiljö saknas"
}

const SIGNIFICANCE_RANK: Record<string, number> = { stor: 5, har: 3, viss: 1 }

// The biotope sketch is only worth showing if it stands for something: pick the
// landscape type shared by the most species that are in season right now.
function dominantHabitat(speciesList: TempusSpecies[]) {
  const tally = new Map<string, { count: number; name: string; species: TempusSpecies }>()
  for (const species of speciesList) {
    const primary = [...(species.landscape_types ?? [])].sort(
      (first, second) =>
        (SIGNIFICANCE_RANK[second.significance] ?? 0) - (SIGNIFICANCE_RANK[first.significance] ?? 0),
    )[0]
    if (!primary) continue
    const key = primary.code || primary.name
    const entry = tally.get(key)
    if (entry) entry.count += 1
    else tally.set(key, { count: 1, name: primary.name, species })
  }
  let best: { count: number; name: string; species: TempusSpecies } | null = null
  for (const entry of tally.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  return best
}

function statusHint(status: TempusSeasonalStatus | undefined) {
  if (status?.status === "coming_into_season" && status.days_until_start != null) return `om ${status.days_until_start} dagar`
  if (status?.status === "going_out_of_season" && status.days_until_end != null) return `${status.days_until_end} dagar kvar`
  return null
}

function formatRouteDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
}

function CornerTicks() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 text-text-faint">
      <span className="absolute -left-px -top-px size-2 border-l border-t border-current" />
      <span className="absolute -right-px -top-px size-2 border-r border-t border-current" />
      <span className="absolute -bottom-px -left-px size-2 border-b border-l border-current" />
      <span className="absolute -bottom-px -right-px size-2 border-b border-r border-current" />
    </span>
  )
}

function PhenoStrip({
  months,
  currentMonth,
  tone,
}: {
  months: Set<number>
  currentMonth: number
  tone: "accent" | "secondary"
}) {
  return (
    <span className="grid grid-cols-12 gap-1" role="img" aria-label="Artens aktiva månader">
      {MONTHS.map((month, index) => (
        <span key={`${month}-${index}`} className="flex flex-col items-center gap-0.5">
          <span
            className={`block h-2.5 w-full border ${
              months.has(index)
                ? tone === "accent"
                  ? "border-accent bg-accent"
                  : "border-secondary bg-secondary"
                : "border-border bg-surface-2/70"
            } ${index === currentMonth ? "outline outline-offset-1 outline-text" : ""}`}
          />
          <span className="font-mono text-[9px] leading-none text-text-faint">{month}</span>
        </span>
      ))}
    </span>
  )
}

function RegisterRow({
  index,
  name,
  scientificName,
  meta,
  href,
  statusLabel,
  statusInk,
  hint,
  months,
  currentMonth,
  tone,
}: {
  index: number
  name: string
  scientificName: string | null
  meta: string
  href: string
  statusLabel: string
  statusInk: string
  hint: string | null
  months: Set<number>
  currentMonth: number
  tone: "accent" | "secondary"
}) {
  return (
    <li>
      <Link
        href={href}
        aria-label={`Visa ${name}`}
        className="block border-b border-border px-2 py-2.5 no-underline transition-colors hover:bg-surface-2/45"
      >
        <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 gap-y-1 xl:min-w-[58rem] xl:grid-cols-[2.5rem_minmax(9rem,13rem)_minmax(12rem,1fr)_minmax(9rem,12rem)_minmax(15rem,18rem)] xl:items-center xl:gap-x-4 xl:gap-y-0">
          <span className="row-span-2 self-start pt-0.5 text-right font-mono text-[12px] tabular-nums text-text-faint xl:row-span-1 xl:self-auto xl:pt-0">
            {String(index).padStart(2, "0")}
          </span>
          <span className="col-start-2 min-w-0 truncate whitespace-nowrap xl:col-auto">
            <span className="font-display text-[15px] text-text">{name}</span>
            {scientificName ? (
              <span className="ml-2 font-mono text-[11px] italic text-text-muted">{scientificName}</span>
            ) : null}
          </span>
          <span className="col-start-2 truncate text-[13px] leading-relaxed text-text-muted xl:col-auto">{meta}</span>
          <span className={`col-span-2 truncate font-display text-xs italic ${statusInk} xl:col-auto`}>
            {statusLabel}
            {hint ? <span className="text-text-faint"> · {hint}</span> : null}
          </span>
          <span className="col-span-2 min-w-0 xl:col-auto">
            <PhenoStrip months={months} currentMonth={currentMonth} tone={tone} />
          </span>
        </div>
      </Link>
    </li>
  )
}

type WindowEntry = { key: string; name: string; href: string; days: number | null }

function SeasonWindow({
  title,
  entries,
  ink,
  emptyText,
}: {
  title: string
  entries: WindowEntry[]
  ink: string
  emptyText: string
}) {
  return (
    <div className="border border-border bg-surface">
      <div className="border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[.16em] text-text-faint">
        {title}
      </div>
      {entries.length > 0 ? (
        <ol>
          {entries.slice(0, 3).map((entry, index) => (
            <li key={entry.key}>
              <Link
                href={entry.href}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border px-4 py-2.5 no-underline transition-colors last:border-b-0 hover:bg-surface-2/45"
              >
                <span className="font-mono text-[12px] tabular-nums text-text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 truncate font-display text-sm text-text">{entry.name}</span>
                <span className={`shrink-0 font-display text-sm italic tabular-nums ${ink}`}>
                  {entry.days != null ? `${entry.days} d` : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-6 text-sm leading-relaxed text-text-muted">{emptyText}</p>
      )}
    </div>
  )
}

function RouteOverview({ routeOverview }: { routeOverview: HomeRouteOverview | null }) {
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

export default function NewHome({
  items,
  areaName,
  todayLabel,
  currentMonth,
  view,
  overview,
  overviewCount,
  overviewPage,
  overviewHasNext,
  overviewHasPrevious,
  overviewIncoming,
  overviewOutgoing,
  routeOverview,
}: {
  items: HomeSpecies[]
  areaName: string
  todayLabel: string
  currentMonth: number
  view: "followed" | "all"
  overview: TempusSeasonalOverview[]
  overviewCount: number
  overviewPage: number
  overviewHasNext: boolean
  overviewHasPrevious: boolean
  overviewIncoming: TempusSeasonalOverview[]
  overviewOutgoing: TempusSeasonalOverview[]
  routeOverview: HomeRouteOverview | null
}) {
  const isAll = view === "all"

  const sortedItems = [...items].sort((first, second) => {
    const firstStatus = first.phenogram?.seasonal_status?.status
    const secondStatus = second.phenogram?.seasonal_status?.status
    return (firstStatus ? STATUS_META[firstStatus].rank : 5) - (secondStatus ? STATUS_META[secondStatus].rank : 5) || speciesName(first.species).localeCompare(speciesName(second.species), "sv")
  })
  const activeCount = items.filter(
    ({ phenogram }) => phenogram?.seasonal_status?.is_in_season || phenogram?.seasonal_status?.is_coming_into_season,
  ).length
  const incomingCount = sortedItems.filter(({ phenogram }) => phenogram?.seasonal_status?.is_coming_into_season).length

  const inSeasonSpecies = sortedItems
    .filter(({ phenogram }) => phenogram?.seasonal_status?.is_in_season)
    .map(({ species }) => species)
  const habitat = isAll
    ? null
    : dominantHabitat(inSeasonSpecies) ?? dominantHabitat(items.map(({ species }) => species))
  const habitatNote = inSeasonSpecies.length > 0 ? "vanligast bland arter i säsong nu" : "vanligast i din bevakning"

  const tally = isAll
    ? [
        { label: "Arter i urvalet", value: overviewCount, lead: true },
        { label: "På väg in", value: overviewIncoming.length, lead: false },
        { label: "På väg ut", value: overviewOutgoing.length, lead: false },
      ]
    : [
        { label: "Följda arter", value: items.length, lead: false },
        { label: "Aktuella nu", value: activeCount, lead: true },
        { label: "På väg in", value: incomingCount, lead: false },
      ]

  const incomingEntries: WindowEntry[] = isAll
    ? overviewIncoming.map((item) => ({
        key: item.id,
        name: item.swedish_name?.trim() || item.scientific_name,
        href: `/taxa/oversikt/${item.dyntaxa_taxon_id}`,
        days: item.seasonal_status.days_until_start ?? null,
      }))
    : sortedItems
        .filter(({ phenogram }) => phenogram?.seasonal_status?.is_coming_into_season)
        .map(({ species, phenogram }) => ({
          key: species.id,
          name: speciesName(species),
          href: `/taxa/foljda/${species.dyntaxa_taxon_id}`,
          days: phenogram?.seasonal_status?.days_until_start ?? null,
        }))
  const outgoingEntries: WindowEntry[] = isAll
    ? overviewOutgoing.map((item) => ({
        key: item.id,
        name: item.swedish_name?.trim() || item.scientific_name,
        href: `/taxa/oversikt/${item.dyntaxa_taxon_id}`,
        days: item.seasonal_status.days_until_end ?? null,
      }))
    : sortedItems
        .filter(({ phenogram }) => phenogram?.seasonal_status?.is_going_out_of_season)
        .map(({ species, phenogram }) => ({
          key: species.id,
          name: speciesName(species),
          href: `/taxa/foljda/${species.dyntaxa_taxon_id}`,
          days: phenogram?.seasonal_status?.days_until_end ?? null,
        }))

  const registerCount = isAll ? overviewCount : items.length

  return (
    <div className="container  py-8 ">
      <div className="flex flex-col gap-10 text-text">
          {/* Sidhuvud */}
          <header className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 font-mono text-[11px] uppercase tracking-[.18em] text-text-faint">
              <span className="text-text-muted">{areaName}</span>
              <span>{todayLabel}</span>
            </div>

            <div className={`grid gap-6 sm:items-start ${habitat ? "sm:grid-cols-[minmax(0,1fr)_16rem]" : ""}`}>
              <div>
                <h1 className="font-display text-[2rem] font-semibold tracking-tight text-text sm:text-4xl lg:text-5xl">
                  Säsongsöversikt
                </h1>
                <span aria-hidden="true" className="mt-3 block h-px w-20 bg-text" />
                <span aria-hidden="true" className="mt-[3px] block h-px w-12 bg-text/50" />
                <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
                  {isAll
                    ? "Rapportstarka arter för området och var i sin årscykel de befinner sig just nu."
                    : "Arterna du bevakar, ordnade efter var i sin årscykel de befinner sig just nu."}
                </p>
              </div>

              {habitat ? (
                <figure className="min-w-0">
                  <div className="relative aspect-[8/5] overflow-hidden border border-border bg-surface-2/40">
                    <BiotopeMap
                      {...biotopePropsFromSpecies(habitat.species)}
                      width={800}
                      height={500}
                      compass
                      aria-hidden="true"
                      className="absolute inset-0 size-full!"
                    />
                    <CornerTicks />
                  </div>
                  <figcaption className="mt-2">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="flex h-1.5 w-16 border border-text">
                        <span className="flex-1 bg-text" />
                        <span className="flex-1" />
                        <span className="flex-1 bg-text" />
                        <span className="flex-1" />
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[.14em] text-text">{habitat.name}</span>
                    </span>
                    <span className="mt-1 block font-display text-sm italic text-text-muted">{habitatNote}</span>
                  </figcaption>
                </figure>
              ) : null}
            </div>

            {/* Index-flikar */}
            <nav aria-label="Urval" className="flex items-end gap-6 border-b border-border">
              <Link
                href="/"
                aria-current={view === "followed" ? "page" : undefined}
                className={`-mb-px border-b-2 pb-2 font-mono text-[12px] uppercase tracking-[.16em] no-underline ${
                  view === "followed"
                    ? "border-accent text-text"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                Följda arter
              </Link>
              <Link
                href="/?view=all"
                aria-current={view === "all" ? "page" : undefined}
                className={`-mb-px border-b-2 pb-2 font-mono text-[12px] uppercase tracking-[.16em] no-underline ${
                  view === "all"
                    ? "border-accent text-text"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                Hela urvalet
              </Link>
            </nav>

            {/* Summering */}
            <dl className="grid grid-cols-3 border-y border-border divide-x divide-border">
              {tally.map((cell) => (
                <div key={cell.label} className="px-2.5 py-3 sm:px-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-text-faint sm:text-[11px] sm:tracking-[.16em]">{cell.label}</dt>
                  <dd
                    className={`mt-1 font-display text-2xl font-semibold tabular-nums sm:text-3xl ${
                      cell.lead ? "text-accent" : "text-text"
                    }`}
                  >
                    {cell.value.toLocaleString("sv-SE")}
                  </dd>
                </div>
              ))}
            </dl>
          </header>

          <RouteOverview routeOverview={routeOverview} />

          {/* Register */}
          <section>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {isAll ? "Hela urvalet" : "Följda arter"}
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-[.16em] text-text-faint">
                {isAll
                  ? `${overviewCount.toLocaleString("sv-SE")} arter · minst 20 rapporter`
                  : registerCount > 0
                    ? `${registerCount} ${registerCount === 1 ? "art" : "arter"}`
                    : "0 arter"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="hidden min-w-[58rem] grid-cols-[2.5rem_minmax(9rem,13rem)_minmax(12rem,1fr)_minmax(9rem,12rem)_minmax(15rem,18rem)] gap-x-4 border-b border-border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[.14em] text-text-faint xl:grid">
                <span className="text-right">Nr</span>
                <span>Art</span>
                <span>{isAll ? "Underlag" : "Livsmiljö"}</span>
                <span>Status</span>
                <span>Aktiv period</span>
              </div>

              {isAll ? (
              overview.length > 0 ? (
                <ol>
                  {overview.map((item, index) => {
                    const meta = STATUS_META[item.seasonal_status.status]
                    const days = item.seasonal_status.is_coming_into_season
                      ? item.seasonal_status.days_until_start
                      : item.seasonal_status.is_going_out_of_season
                        ? item.seasonal_status.days_until_end
                        : null
                    return (
                      <RegisterRow
                        key={item.id}
                        index={index + 1 + (overviewPage - 1) * 24}
                        name={item.swedish_name?.trim() || item.scientific_name}
                        scientificName={item.swedish_name ? item.scientific_name : null}
                        meta={`${item.record_count.toLocaleString("sv-SE")} rapporter · v. ${item.activity_window.start_week}–${item.activity_window.end_week}`}
                        href={`/taxa/oversikt/${item.dyntaxa_taxon_id}`}
                        statusLabel={meta.label}
                        statusInk={meta.ink}
                        hint={days != null ? `${days} d` : null}
                        months={activeMonthsForWindow(item.activity_window)}
                        currentMonth={currentMonth}
                        tone="secondary"
                      />
                    )
                  })}
                </ol>
              ) : (
                <p className="border-b border-border px-2 py-12 text-center text-sm text-text-muted">
                  Inga arter med minst 20 rapporter hittades för det valda området.
                </p>
              )
            ) : sortedItems.length > 0 ? (
              <ol>
                {sortedItems.map(({ species, phenogram }, index) => {
                  const status = phenogram?.seasonal_status
                  const meta = status ? STATUS_META[status.status] : null
                  return (
                    <RegisterRow
                      key={species.id}
                      index={index + 1}
                      name={speciesName(species)}
                      scientificName={species.swedish_name ? species.scientific_name : null}
                      meta={habitatSummary(species)}
                      href={`/taxa/foljda/${species.dyntaxa_taxon_id}`}
                      statusLabel={meta?.label ?? "Säsongsdata saknas"}
                      statusInk={meta?.ink ?? "text-text-faint"}
                      hint={statusHint(status)}
                      months={activeMonths(phenogram)}
                      currentMonth={currentMonth}
                      tone="accent"
                    />
                  )
                })}
              </ol>
            ) : (
              <div className="border-b border-border">
                <div className="px-4 py-14 text-center">
                  <h3 className="font-display text-xl font-semibold">Inga följda arter ännu</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
                    Välj arter i taxakatalogen så förs de in här med sin säsongsdata.
                  </p>
                  <Link
                    href="/taxa"
                    className="mt-5 inline-block border border-accent bg-accent px-4 py-2 text-sm font-medium text-accent-contrast no-underline hover:bg-accent-hover"
                  >
                    Till taxakatalogen
                  </Link>
                </div>
              </div>
              )}
            </div>

            {/* Förklaring */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border border-border bg-surface-2/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[.13em] text-text-faint">
              <span className="text-text-muted">Förklaring</span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`inline-block size-2.5 border ${isAll ? "border-secondary bg-secondary" : "border-accent bg-accent"}`}
                />
                aktiv månad
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block size-2 border border-border bg-surface-2 outline outline-offset-1 outline-text"
                />
                innevarande månad
              </span>
              <span className="flex flex-wrap items-center gap-x-3">
                <span className="text-text-muted">Status:</span>
                <span className="text-accent">i säsong</span>
                <span className="text-secondary">på väg in</span>
                <span className="text-warning">på väg ut</span>
              </span>
            </div>

            {isAll && (overviewHasPrevious || overviewHasNext) ? (
              <nav
                className="mt-5 flex items-center justify-center gap-5 border-t border-border pt-4 font-mono text-[11px] uppercase tracking-[.14em]"
                aria-label="Sidnavigering för hela urvalet"
              >
                {overviewHasPrevious ? (
                  <Link href={`/?view=all&p=${overviewPage - 1}`} className="text-text-muted no-underline hover:text-text">
                    ‹ Föregående
                  </Link>
                ) : (
                  <span className="text-text-faint">‹ Föregående</span>
                )}
                <span className="text-text-faint">Sida {overviewPage}</span>
                {overviewHasNext ? (
                  <Link href={`/?view=all&p=${overviewPage + 1}`} className="text-text-muted no-underline hover:text-text">
                    Nästa ›
                  </Link>
                ) : (
                  <span className="text-text-faint">Nästa ›</span>
                )}
              </nav>
            ) : null}
          </section>

          {/* Säsongsfönster */}
          <section className="grid gap-4 sm:grid-cols-2">
            <SeasonWindow
              title="Snart i säsong"
              entries={incomingEntries}
              ink="text-secondary"
              emptyText={
                isAll
                  ? "Inga rapportstarka arter väntas gå in i säsong just nu."
                  : "Ingen bevakad art väntas gå in i säsong just nu."
              }
            />
            <SeasonWindow
              title="Snart ur säsong"
              entries={outgoingEntries}
              ink="text-warning"
              emptyText={
                isAll
                  ? "Inga rapportstarka arter väntas lämna säsongen just nu."
                  : "Ingen bevakad art väntas lämna säsongen just nu."
              }
            />
          </section>

          <p className="text-right font-display text-[10px] italic text-text-faint">
            Sammanställt ur Dyntaxa · aktuellt per {todayLabel}
          </p>
      </div>
    </div>
  )
}
