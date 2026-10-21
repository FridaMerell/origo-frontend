"use client"

import { useState, type CSSProperties } from "react"
import type { TempusInterestingSpots } from "@/app/lib/dal"
import { CurrentLocationButton, type GeolocationCoords } from "@/app/components/ui/CurrentLocationButton"

function formatDistance(distance: number) {
  return distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1).replace(".", ",")} km`
}

function highlightLabel(highlight: unknown) {
  if (typeof highlight === "string") return highlight
  if (!highlight || typeof highlight !== "object") return null
  const item = highlight as Record<string, unknown>
  const nested = item.species ?? item.species_detail
  const nestedLabel = nested && typeof nested === "object"
    ? (nested as Record<string, unknown>).swedish_name ?? (nested as Record<string, unknown>).vernacular_name ?? (nested as Record<string, unknown>).common_name ?? (nested as Record<string, unknown>).name ?? (nested as Record<string, unknown>).scientific_name
    : null
  const label = item.swedish_name ?? item.vernacular_name ?? item.common_name ?? item.taxon__swedish_name ?? item.taxon__vernacular_name ?? nestedLabel ?? item.label ?? item.title ?? item.text ?? item.description ?? item.species_name ?? item.name ?? item.taxon_name ?? item.scientific_name ?? item.taxon__scientific_name ?? (typeof item.species === "string" ? item.species : null)
  if (typeof label === "string") return label
  const firstString = Object.values(item).find((value) => typeof value === "string")
  return typeof firstString === "string" ? firstString : null
}

function detailLabels(items: unknown[]) {
  return items.map(highlightLabel).filter((item): item is string => Boolean(item))
}

// On the start page's sheet the list has no rules of its own: a heading and a
// sentence on the left, its button on the right. The button is Tempus's usual
// one, as "Ny checklista" and "Ny observation" on their pages: the shared
// Button's "paper-bordered" variant with square corners.

export function InterestingSpots({ initialData = null, allowLocation = false, label = "Nära dig", onSheet = false, ledger = false }: { initialData?: TempusInterestingSpots | null; allowLocation?: boolean; label?: string; onSheet?: boolean; ledger?: boolean }) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<"distance" | "species_count">("distance")
  const load = async ({ latitude, longitude }: Pick<GeolocationCoords, "latitude" | "longitude">) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ longitude: String(longitude), latitude: String(latitude) })
      const response = await fetch(`/api/tempus/interesting-spots/?${params}`, { cache: "no-store" })
      if (!response.ok) throw new Error("Kunde inte hämta intressanta platser.")
      setData(await response.json() as TempusInterestingSpots)
      setShowAll(false)
      setExpandedRanks(new Set())
    } catch {
      setError("Intressanta platser kunde inte hämtas just nu.")
    } finally {
      setLoading(false)
    }
  }
  const note = "mt-4 text-sm text-text-muted"
  const untouched = !data && !loading && !error
  const sheetAction = allowLocation ? <CurrentLocationButton onLocate={load} onError={setError} label="Hämta nära mig" pendingLabel="Hämtar…" variant="paper-bordered" className="shrink-0 rounded-none text-sm" /> : null

  // Liggarvarianten (platssidan): poster som löpande text med avståndet i en egen kolumn,
  // och sorteringen som kryssrutor. Ingen ögonbrynsetikett.
  if (ledger) {
    const visibleSpots = data
      ? [...data.spots]
          .sort((first, second) => sortBy === "distance" ? first.distance_m - second.distance_m : second.species_count - first.species_count)
          .slice(0, showAll ? undefined : 4)
      : []
    return (
      <section aria-labelledby="interesting-spots-title">
        <h2 id="interesting-spots-title" className="break-words border-b-2 border-text pb-1.5 font-display text-[1.375rem] font-medium italic sm:text-[1.625rem]">{label}</h2>
        <div role="group" aria-label="Sortera platser" className="mt-1.5 flex flex-wrap items-center gap-x-1 font-display text-sm italic text-text-muted">
          <span className="mr-2.5">Sortera:</span>
          {(["distance", "species_count"] as const).map((value) => {
            const active = sortBy === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setSortBy(value)}
                className={`inline-flex min-h-11 items-center gap-2 pl-1 pr-3 text-[1.0625rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${active ? "text-text" : "text-text-muted hover:text-text"}`}
              >
                <span className="grid size-3.5 place-items-center border border-text" aria-hidden="true">
                  <span className={`tempus-tick size-2.5 bg-text ${active ? "scale-100" : "scale-0"}`} />
                </span>
                {value === "distance" ? "Avstånd" : "Antal arter"}
              </button>
            )
          })}
        </div>
        {loading ? <p className={note}>Hämtar intressanta platser…</p> : null}
        {error ? <p className="mt-4 text-sm text-danger" role="alert">{error}</p> : null}
        {!loading && !error && data && data.spots.length === 0 ? <p className={note}>Inga intressanta platser hittades i närheten.</p> : null}
        {!loading && !error && visibleSpots.length > 0 ? <>
          <ol className="border-t border-[#b9a779]/60">
            {visibleSpots.map((spot, index) => {
              const highlights = spot.highlights.map(highlightLabel).filter((highlight): highlight is string => Boolean(highlight))
              const notableRecent = detailLabels(spot.notable_recent)
              const topSpecies = detailLabels(spot.top_species)
              const expanded = expandedRanks.has(spot.rank)
              return <li key={`${spot.rank}-${spot.locality}`} style={{ "--i": index } as CSSProperties} className="tempus-row tempus-row-in grid grid-cols-[3rem_minmax(0,1fr)] border-b border-[#b9a779]/60 sm:grid-cols-[3rem_minmax(0,1fr)_6rem]">
                <span className="row-span-2 border-r border-[#b9a779]/60 pt-3.5 text-center font-display text-base font-bold italic text-text-muted sm:row-span-1">{spot.rank}.</span>
                <div className="min-w-0 px-4 pt-3 text-base leading-[1.42] sm:pb-3">
                  <p className="text-left [hyphens:auto] sm:text-justify">
                    <span className="font-display text-[1.1875rem] italic">{spot.locality}</span>
                    {". "}
                    <span className="text-text-muted">{spot.species_count} arter{spot.municipality ? ` · ${spot.municipality}` : ""}.</span>
                    {highlights.length > 0 ? <>{" "}<span className="text-accent">{highlights.join(" · ")}.</span></> : null}
                    {" "}
                    <button type="button" onClick={() => setExpandedRanks((ranks) => { const next = new Set(ranks); if (next.has(spot.rank)) next.delete(spot.rank); else next.add(spot.rank); return next })} className="font-display text-[0.8125rem] italic text-accent underline underline-offset-4 hover:text-accent-hover" aria-expanded={expanded}>{expanded ? "Dölj detaljer" : "Visa detaljer"}</button>
                  </p>
                  {expanded ? <div className="tempus-detail-in mt-3 space-y-2 border-l border-accent pl-3 text-xs text-text-muted">
                    {highlights.length > 0 ? <p><span className="font-medium text-text">Highlights:</span> {highlights.join(" · ")}</p> : null}
                    {notableRecent.length > 0 ? <p><span className="font-medium text-text">Anmärkningsvärda fynd på sistone:</span> {notableRecent.join(" · ")}</p> : null}
                    {topSpecies.length > 0 ? <p><span className="font-medium text-text">Topp-arter:</span> {topSpecies.join(" · ")}</p> : null}
                    {highlights.length === 0 && notableRecent.length === 0 && topSpecies.length === 0 ? <p>Inga ytterligare detaljer tillgängliga.</p> : null}
                  </div> : null}
                </div>
                <span className="col-start-2 whitespace-nowrap px-4 pb-3 pt-1 font-display text-sm italic text-text-muted sm:col-start-3 sm:border-l sm:border-[#b9a779]/60 sm:px-3 sm:pt-3.5 sm:text-right">{formatDistance(spot.distance_m)}</span>
              </li>
            })}
          </ol>
          {data && data.spots.length > 4 ? <button type="button" onClick={() => setShowAll((visible) => !visible)} className="mt-2 inline-flex min-h-11 items-center font-display text-sm italic text-accent underline underline-offset-4 hover:text-accent-hover">{showAll ? "Visa färre" : "Visa mer"}</button> : null}
        </> : null}
      </section>
    )
  }

  return (
    <section className={onSheet ? "min-w-0" : "border-y border-border py-5"} aria-labelledby="interesting-spots-title">
      {onSheet ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="interesting-spots-title" className="font-display text-xl font-semibold">{label}</h2>
            {untouched && allowLocation ? (
              <p className="mt-1 text-base text-text-muted">
                Tillåt platsåtkomst för att se platser med intressanta observationer nära dig.
              </p>
            ) : null}
          </div>
          {sheetAction}
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-text-faint">Externa observationer</p><h2 id="interesting-spots-title" className="mt-1 font-display text-2xl font-medium italic">{label}</h2></div>{allowLocation ? <CurrentLocationButton onLocate={load} onError={setError} label="Hämta nära mig" pendingLabel="Hämtar…" size="sm" /> : null}</div>
      )}
      {loading ? <p className={note}>Hämtar intressanta platser…</p> : null}
      {error ? <p className="mt-4 text-sm text-danger" role="alert">{error}</p> : null}
      {!loading && !error && data && data.spots.length === 0 ? <p className={note}>Inga intressanta platser hittades i närheten.</p> : null}
      {!loading && !error && data && data.spots.length > 0 ? <>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs" role="group" aria-label="Sortera platser">
          <span className="text-text-muted">Sortera:</span>
          {(["distance", "species_count"] as const).map((value) => {
            const active = sortBy === value
            return <button key={value} type="button" aria-pressed={active} onClick={() => setSortBy(value)} className={`border px-2.5 py-1 font-display italic ${active ? "border-accent bg-accent text-white" : "border-border text-text-muted hover:border-accent hover:text-accent"}`}>
              {value === "distance" ? "Avstånd" : "Antal arter"}
            </button>
          })}
        </div>
        <ol className="mt-4 divide-y divide-border border-y border-border">
          {([...data.spots].sort((first, second) => sortBy === "distance" ? first.distance_m - second.distance_m : second.species_count - first.species_count).slice(0, showAll ? undefined : 4)).map((spot) => {
            const highlights = spot.highlights.map(highlightLabel).filter((highlight): highlight is string => Boolean(highlight))
            const notableRecent = detailLabels(spot.notable_recent)
            const topSpecies = detailLabels(spot.top_species)
            const expanded = expandedRanks.has(spot.rank)
            return <li key={`${spot.rank}-${spot.locality}`} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-3 py-3">
              <span className="font-mono text-xs text-text-faint">{String(spot.rank).padStart(2, "0")}</span>
              <div className="min-w-0">
                <p className="font-display text-lg italic">{spot.locality}</p>
                <p className="text-xs text-text-muted">{spot.species_count} arter{spot.municipality ? ` · ${spot.municipality}` : ""}</p>
                {highlights.length > 0 ? <p className="mt-1 text-xs text-accent">{highlights.join(" · ")}</p> : null}
                {expanded ? <div className="mt-3 space-y-2 border-l border-accent pl-3 text-xs text-text-muted">
                  {highlights.length > 0 ? <p><span className="font-medium text-text">Highlights:</span> {highlights.join(" · ")}</p> : null}
                  {notableRecent.length > 0 ? <p><span className="font-medium text-text">Anmärkningsvärda fynd på sistone:</span> {notableRecent.join(" · ")}</p> : null}
                  {topSpecies.length > 0 ? <p><span className="font-medium text-text">Topp-arter:</span> {topSpecies.join(" · ")}</p> : null}
                  {highlights.length === 0 && notableRecent.length === 0 && topSpecies.length === 0 ? <p>Inga ytterligare detaljer tillgängliga.</p> : null}
                </div> : null}
                <button type="button" onClick={() => setExpandedRanks((ranks) => { const next = new Set(ranks); if (next.has(spot.rank)) next.delete(spot.rank); else next.add(spot.rank); return next })} className="mt-2 font-display text-xs italic text-accent underline underline-offset-4 hover:text-accent-hover" aria-expanded={expanded}>{expanded ? "Dölj detaljer" : "Visa detaljer"}</button>
              </div>
              <span className="text-right font-mono text-xs text-text-muted">{formatDistance(spot.distance_m)}</span>
            </li>
          })}
        </ol>
        {data.spots.length > 4 ? <button type="button" onClick={() => setShowAll((visible) => !visible)} className="mt-3 font-display text-sm italic text-accent underline underline-offset-4 hover:text-accent-hover">{showAll ? "Visa färre" : "Visa mer"}</button> : null}
      </> : null}
      {untouched && allowLocation && !onSheet ? <p className={note}>Tillåt platsåtkomst för att se platser med intressanta observationer nära dig.</p> : null}
    </section>
  )
}
