import type { TempusSeasonalOverview, TempusSeasonalStatus } from "@/app/lib/dal"
import type { WindowEntry } from "./season-windows"

export type HomeSpecies = TempusSeasonalOverview

export const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]

export const STATUS_META: Record<
  TempusSeasonalStatus["status"],
  { label: string; ink: string; rank: number }
> = {
  at_peak: { label: "Toppsäsong", ink: "text-accent", rank: 0 },
  in_season: { label: "I säsong", ink: "text-accent", rank: 1 },
  coming_into_season: { label: "På väg in", ink: "text-secondary", rank: 2 },
  going_out_of_season: { label: "På väg ut", ink: "text-warning", rank: 3 },
  out_of_season: { label: "Utanför säsong", ink: "text-text-faint", rank: 4 },
}

export const speciesName = (species: HomeSpecies) =>
  species.swedish_name?.trim() || species.scientific_name?.trim() || "Okänd art"
const weekToMonth = (week: number) => Math.min(11, Math.floor(((week - 1) * 12) / 52))

export function activeMonthsForWindow({ start_week: start, end_week: end }: { start_week: number; end_week: number }) {
  const weeks = start <= end
    ? Array.from({ length: end - start + 1 }, (_, index) => start + index)
    : [...Array.from({ length: 53 - start }, (_, index) => start + index), ...Array.from({ length: end }, (_, index) => index + 1)]
  return new Set(weeks.map(weekToMonth))
}

export function activeMonths(species: HomeSpecies) {
  return activeMonthsForWindow(species.activity_window)
}

export function habitatSummary(species: HomeSpecies) {
  return species.habitats.join(" · ") || "Livsmiljö saknas"
}

// The biotope sketch is only worth showing if it stands for something: pick the
// landscape type shared by the most species that are in season right now.
export function dominantHabitat(speciesList: HomeSpecies[]) {
  const tally = new Map<string, { count: number; name: string; species: HomeSpecies }>()
  for (const species of speciesList) {
    const primary = species.habitats[0]
    if (!primary) continue
    const key = primary
    const entry = tally.get(key)
    if (entry) entry.count += 1
    else tally.set(key, { count: 1, name: primary, species })
  }
  let best: { count: number; name: string; species: HomeSpecies } | null = null
  for (const entry of tally.values()) {
    if (!best || entry.count > best.count) best = entry
  }
  return best
}

export function statusHint(status: TempusSeasonalStatus | undefined) {
  if (status?.status === "coming_into_season" && status.days_until_start != null) return `om ${status.days_until_start} dagar`
  if (status?.status === "going_out_of_season" && status.days_until_end != null) return `${status.days_until_end} dagar kvar`
  return null
}

export function toWindowEntry(
  item: HomeSpecies,
  hrefPrefix: string,
  dayField: "days_until_start" | "days_until_end",
  nameOf: (item: HomeSpecies) => string,
): WindowEntry {
  return {
    key: item.id,
    name: nameOf(item),
    href: `${hrefPrefix}/${item.dyntaxa_taxon_id}`,
    days: item.seasonal_status[dayField] ?? null,
  }
}
