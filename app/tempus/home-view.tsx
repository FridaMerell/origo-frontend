import type { TempusSeasonalOverview } from "@/app/lib/dal"
import { STATUS_META, speciesName, dominantHabitat, toWindowEntry, type HomeSpecies } from "./home/season-helpers"
import { SeasonOverviewHeader } from "./home/season-overview-header"
import { SeasonWindows } from "./home/season-windows"
import { SpeciesRegister } from "./home/species-register"
import { RouteOverview, type HomeRouteOverview } from "./home/route-overview"

export type { HomeSpecies, HomeRouteOverview }

export default function HomeView({
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
    return STATUS_META[first.seasonal_status.status].rank - STATUS_META[second.seasonal_status.status].rank || speciesName(first).localeCompare(speciesName(second), "sv")
  })
  const activeCount = items.filter(
    (species) => species.seasonal_status.is_in_season || species.seasonal_status.is_coming_into_season,
  ).length
  const incomingCount = sortedItems.filter((species) => species.seasonal_status.is_coming_into_season).length

  const inSeasonSpecies = sortedItems
    .filter((species) => species.seasonal_status.is_in_season)
  const habitat = isAll
    ? null
    : dominantHabitat(inSeasonSpecies) ?? dominantHabitat(items)
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

  const overviewName = (item: HomeSpecies) => item.swedish_name?.trim() || item.scientific_name

  const incomingEntries = isAll
    ? overviewIncoming.map((item) => toWindowEntry(item, "/taxa/oversikt", "days_until_start", overviewName))
    : sortedItems
        .filter((species) => species.seasonal_status.is_coming_into_season)
        .map((species) => toWindowEntry(species, "/taxa/foljda", "days_until_start", speciesName))
  const outgoingEntries = isAll
    ? overviewOutgoing.map((item) => toWindowEntry(item, "/taxa/oversikt", "days_until_end", overviewName))
    : sortedItems
        .filter((species) => species.seasonal_status.is_going_out_of_season)
        .map((species) => toWindowEntry(species, "/taxa/foljda", "days_until_end", speciesName))

  const registerCount = isAll ? overviewCount : items.length

  return (
    <div className="container  py-8 ">
      <div className="flex flex-col gap-10 text-text">
        <SeasonOverviewHeader
          areaName={areaName}
          todayLabel={todayLabel}
          view={view}
          tally={tally}
          habitat={habitat}
          habitatNote={habitatNote}
        />

        <RouteOverview routeOverview={routeOverview} />

        <SpeciesRegister
          isAll={isAll}
          sortedItems={sortedItems}
          overview={overview}
          overviewCount={overviewCount}
          overviewPage={overviewPage}
          overviewHasNext={overviewHasNext}
          overviewHasPrevious={overviewHasPrevious}
          registerCount={registerCount}
          currentMonth={currentMonth}
        />

        <SeasonWindows isAll={isAll} incomingEntries={incomingEntries} outgoingEntries={outgoingEntries} />

        <p className="text-right font-display text-[10px] italic text-text-faint">
          Sammanställt ur Dyntaxa · aktuellt per {todayLabel}
        </p>
      </div>
    </div>
  )
}
