"use client"

import { useState } from "react"
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

export function InterestingSpots({ initialData = null, allowLocation = false, label = "Nära dig" }: { initialData?: TempusInterestingSpots | null; allowLocation?: boolean; label?: string }) {
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
  return (
    <section className="border-y border-border py-5" aria-labelledby="interesting-spots-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-text-faint">Externa observationer</p><h2 id="interesting-spots-title" className="mt-1 font-display text-2xl font-medium italic">{label}</h2></div>{allowLocation ? <CurrentLocationButton onLocate={load} onError={setError} label="Hämta nära mig" pendingLabel="Hämtar…" size="sm" /> : null}</div>
      {loading ? <p className="mt-4 text-sm text-text-muted">Hämtar intressanta platser…</p> : null}
      {error ? <p className="mt-4 text-sm text-danger" role="alert">{error}</p> : null}
      {!loading && !error && data && data.spots.length === 0 ? <p className="mt-4 text-sm text-text-muted">Inga intressanta platser hittades i närheten.</p> : null}
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
                  {notableRecent.length > 0 ? <p><span className="font-medium text-text">Nyligen noterbart:</span> {notableRecent.join(" · ")}</p> : null}
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
      {!data && !loading && !error && allowLocation ? <p className="mt-4 text-sm text-text-muted">Tillåt platsåtkomst för att se platser med intressanta observationer nära dig.</p> : null}
    </section>
  )
}
