import type { TempusSeasonalOverview, TempusSeasonalStatus } from "@/app/lib/dal"
import type { HomeViewName } from "./selection"

export type HomeSpecies = TempusSeasonalOverview

export const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

export const STATUS_META: Record<
  TempusSeasonalStatus["status"],
  // `ink` colours the status text; `fill` colours the active month cells the same way.
  { label: string; ink: string; fill: string; rank: number }
> = {
  at_peak: { label: "Toppsäsong", ink: "text-accent", fill: "border-accent bg-accent", rank: 0 },
  in_season: { label: "I säsong", ink: "text-accent", fill: "border-accent bg-accent", rank: 1 },
  coming_into_season: { label: "På väg in", ink: "text-secondary", fill: "border-secondary bg-secondary", rank: 2 },
  going_out_of_season: { label: "På väg ut", ink: "text-warning", fill: "border-warning bg-warning", rank: 3 },
  // A species out of season still has its active months drawn in the accent, like one in season.
  out_of_season: { label: "Utanför säsong", ink: "text-text-faint", fill: "border-accent bg-accent", rank: 4 },
}

export const formatCount = (value: number) => value.toLocaleString("sv-SE")

export const speciesName = (species: HomeSpecies) =>
  species.swedish_name?.trim() || species.scientific_name?.trim() || "Okänd art"

// The species page, under the selection it was reached from.
export const speciesHref = (species: HomeSpecies, view: HomeViewName) =>
  `/taxa/${view === "followed" ? "foljda" : "oversikt"}/${species.dyntaxa_taxon_id}`

// In season first, then by name.
export const byStatusThenName = (first: HomeSpecies, second: HomeSpecies) =>
  STATUS_META[first.seasonal_status.status].rank - STATUS_META[second.seasonal_status.status].rank ||
  speciesName(first).localeCompare(speciesName(second), "sv")

const weekToMonth = (week: number) => Math.min(11, Math.floor(((week - 1) * 12) / 52))

// The months (0–11) an activity window touches. A window may run over the new year.
export function activeMonths({ start_week: start, end_week: end }: HomeSpecies["activity_window"]) {
  const weeks = start <= end
    ? Array.from({ length: end - start + 1 }, (_, index) => start + index)
    : [...Array.from({ length: 53 - start }, (_, index) => start + index), ...Array.from({ length: end }, (_, index) => index + 1)]
  return new Set(weeks.map(weekToMonth))
}

export type Habitat = { count: number; name: string; species: HomeSpecies }

// The biotope map is only worth showing if it stands for something: the
// landscape type that is the first habitat of the most species in the list.
export function dominantHabitat(speciesList: HomeSpecies[]): Habitat | null {
  const tally = new Map<string, Habitat>()
  for (const species of speciesList) {
    const primary = species.habitats[0]
    if (!primary) continue
    const entry = tally.get(primary)
    if (entry) entry.count += 1
    else tally.set(primary, { count: 1, name: primary, species })
  }
  let best: Habitat | null = null
  for (const entry of tally.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  return best
}
