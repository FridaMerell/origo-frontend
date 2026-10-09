"use client"

import { useMemo } from "react"
import type { TempusSeasonalLandscape } from "@/app/lib/dal"
import { useOverview, useOverviewResource } from "./overview-provider"
import { WINDOW_DAYS, type OverviewPage, type OverviewResource } from "./resources"
import { byStatusThenName, dominantHabitat, type Habitat, type HomeSpecies } from "./season-helpers"
import type { HomeViewName } from "./selection"

// Everything the start page shows, in one shape whichever selection is chosen.
// The two selections are built by one function each, below; the components
// only draw what they are handed and never ask which selection it is.

export type TallyCell = { label: string; value: number | null; lead: boolean; note: string }
export type SeasonWindowKind = "incoming" | "outgoing"

// A list of species with what is needed to page through it.
export type SpeciesList = {
  rows: HomeSpecies[]
  count: number
  hasNext: boolean
  hasPrevious: boolean
  // A newer answer is on its way; `rows` is still the previous one.
  loading: boolean
}

export type HomeData = {
  view: HomeViewName
  intro: string
  tally: { cells: TallyCell[]; loading: boolean }
  // The landscape type the header's map shows, and why that one.
  map: { habitat: Habitat | null; reason: string }
  windows: Record<SeasonWindowKind, SpeciesList & { emptyText: string }>
  register: SpeciesList
  // Every current species, whatever the register is narrowed to. Null until known.
  currentCount: number | null
  // The whole selection per landscape type: every type, and the ones chosen to be shown.
  landscapes: { all: TempusSeasonalLandscape[]; shown: TempusSeasonalLandscape[]; loading: boolean }
}

const toList = (read: { data: OverviewPage | null; loading: boolean }): SpeciesList => ({
  rows: read.data?.results ?? [],
  count: read.data?.count ?? 0,
  hasNext: Boolean(read.data?.next),
  hasPrevious: Boolean(read.data?.previous),
  loading: read.loading,
})

// The whole selection: every read is its own request, paged by the server.
function useWholeSelection(active: boolean): HomeData {
  const { selection, resources } = useOverview()
  // A read is only made while this selection is the one on screen.
  const when = <T,>(resource: OverviewResource<T>, wanted = true) => (active && wanted ? resource : null)

  const total = useOverviewResource(when(resources.total()))
  const current = useOverviewResource(when(resources.currentCount(selection)))
  const sample = useOverviewResource(when(resources.sample()))
  const incoming = toList(useOverviewResource(when(resources.incoming(selection.incomingPage))))
  const outgoing = toList(useOverviewResource(when(resources.outgoing(selection.outgoingPage))))
  const register = toList(
    useOverviewResource(when(resources.register(selection.landscapeType, selection.page), selection.mode === "list")),
  )
  const landscapes = useOverviewResource(when(resources.landscapes(), selection.mode === "landscape"))

  const currentCount = current.data?.count ?? null
  const everyLandscape = landscapes.data ?? []

  return {
    view: "all",
    intro: "Rapportstarka arter för området och var i sin årscykel de befinner sig just nu.",
    tally: {
      loading: total.loading || current.loading || incoming.loading,
      cells: [
        { label: "Arter i urvalet", value: total.data?.count ?? null, lead: false, note: "Minst 20 rapporter" },
        // The current species all have a seasonal signal, so everything that
        // is not still on its way in is in season right now.
        { label: "Aktuella nu", value: currentCount == null ? null : Math.max(0, currentCount - incoming.count), lead: true, note: "I säsong" },
        { label: "På väg in", value: incoming.count, lead: false, note: "Inom 21 dagar" },
      ],
    },
    map: { habitat: dominantHabitat(sample.data?.results ?? []), reason: "vanligast bland områdets mest aktuella arter" },
    windows: {
      incoming: { ...incoming, emptyText: `Inga arter går in i säsong inom ${WINDOW_DAYS} dagar.` },
      outgoing: { ...outgoing, emptyText: `Inga arter går ur säsong inom ${WINDOW_DAYS} dagar.` },
    },
    register,
    currentCount,
    landscapes: {
      all: everyLandscape,
      shown: selection.landscapes.length > 0
        ? everyLandscape.filter((landscape) => selection.landscapes.includes(landscape.name))
        : everyLandscape,
      loading: landscapes.loading,
    },
  }
}

// The followed species: one read holds them all, and every part is worked out from it.
function useFollowedSelection(active: boolean): HomeData {
  const { resources } = useOverview()
  const read = useOverviewResource(active ? resources.followed() : null)
  const species = useMemo(() => [...(read.data?.results ?? [])].sort(byStatusThenName), [read.data])

  const inSeason = species.filter((item) => item.seasonal_status.is_in_season)
  const incoming = species.filter((item) => item.seasonal_status.is_coming_into_season)
  const outgoing = species.filter((item) => item.seasonal_status.is_going_out_of_season)
  // All of it is on screen at once, so there is nothing to page through.
  const whole = (rows: HomeSpecies[]): SpeciesList => ({ rows, count: rows.length, hasNext: false, hasPrevious: false, loading: read.loading })

  return {
    view: "followed",
    intro: "Arterna du bevakar, ordnade efter var i sin årscykel de befinner sig just nu.",
    tally: {
      loading: read.loading,
      cells: [
        { label: "Följda arter", value: species.length, lead: false, note: "I din bevakning" },
        { label: "Aktuella nu", value: inSeason.length, lead: true, note: "I säsong" },
        { label: "På väg in", value: incoming.length, lead: false, note: "Inom 21 dagar" },
      ],
    },
    map: {
      habitat: dominantHabitat(inSeason) ?? dominantHabitat(species),
      reason: inSeason.length > 0 ? "vanligast bland arter i säsong nu" : "vanligast i din bevakning",
    },
    windows: {
      incoming: { ...whole(incoming), emptyText: `Ingen av dina arter går in i säsong inom ${WINDOW_DAYS} dagar.` },
      outgoing: { ...whole(outgoing), emptyText: `Ingen av dina arter går ur säsong inom ${WINDOW_DAYS} dagar.` },
    },
    register: whole(species),
    currentCount: null,
    landscapes: { all: [], shown: [], loading: false },
  }
}

// Called once, by the page's view. Both selections are prepared, since hooks
// cannot be skipped, but only the chosen one reads anything.
export function useHomeData(): HomeData {
  const { view } = useOverview().selection
  const whole = useWholeSelection(view === "all")
  const followed = useFollowedSelection(view === "followed")
  return view === "all" ? whole : followed
}
