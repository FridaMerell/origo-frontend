"use client"

import { biotopePropsFromSpecies } from "../ui/biotope-map/BiotopeMap"
import { MapBackdrop } from "./map-backdrop"
import type { HomeData } from "./overview-data"
import { useOverview } from "./overview-provider"
import { formatCount, type Habitat } from "./season-helpers"
import { LABEL, pending } from "./styles"
import { ViewTabs } from "./view-tabs"

function ScaleBar() {
  return (
    <span aria-hidden="true" className="flex h-1.5 w-16 border border-text">
      <span className="flex-1 bg-text" />
      <span className="flex-1" />
      <span className="flex-1 bg-text" />
      <span className="flex-1" />
    </span>
  )
}

// The header's map fills the right half behind the heading. Its caption says
// which landscape type it shows and why that one.
function HeaderMap({ habitat, reason, areaName }: { habitat: Habitat; reason: string; areaName: string }) {
  return (
    <figure className="pointer-events-none absolute -inset-y-6 right-0 hidden w-[70%] overflow-hidden sm:block">
      <MapBackdrop ink="header" biotope={biotopePropsFromSpecies(habitat.species).biotope} seed={areaName} />
      <figcaption className="absolute inset-0 flex flex-col items-end justify-end pb-8">
        <span className="flex items-center gap-2">
          <ScaleBar />
          <span className={`${LABEL} text-text`}>{habitat.name}</span>
        </span>
        <span className="mt-1 block font-display text-sm italic text-text-muted">{reason}</span>
      </figcaption>
    </figure>
  )
}

// The summary's three figures, in thirds like the register's columns. The
// dividers stand in the gaps between them.
function Tally({ cells, loading, ruled }: HomeData["tally"] & { ruled: boolean }) {
  return (
    <dl aria-busy={loading} className={`grid grid-cols-3 gap-x-8 pt-8 ${ruled ? "border-t border-border" : ""} ${pending(loading)}`}>
      {cells.map((cell, index) => (
        <div key={cell.label} className={index === 0 ? "" : "-ml-4 border-l border-border pl-4"}>
          <dt className={`${LABEL} text-text`}>{cell.label}</dt>
          <dd className={`mt-2.5 font-display text-3xl font-semibold leading-none tabular-nums sm:text-5xl ${cell.lead ? "text-accent" : "text-text"}`}>
            {cell.value == null ? "–" : formatCount(cell.value)}
          </dd>
          <dd className="mt-2.5 text-sm text-text-muted">{cell.note}</dd>
        </div>
      ))}
    </dl>
  )
}

export function SeasonOverviewHeader({
  areaName,
  intro,
  map,
  tally,
}: { areaName: string } & Pick<HomeData, "intro" | "map" | "tally">) {
  const { isGuest } = useOverview()

  return (
    <header>
      <div className={`relative ${map.habitat ? "sm:min-h-72" : ""}`}>
        {map.habitat ? <HeaderMap key={map.habitat.name} habitat={map.habitat} reason={map.reason} areaName={areaName} /> : null}

        <div className="relative">
          <h1 className="font-display text-[2rem] font-semibold tracking-tight text-text sm:text-4xl lg:text-5xl">
            Säsongsöversikt
          </h1>
          <span aria-hidden="true" className="mt-3 block h-px w-20 bg-text" />
          <span aria-hidden="true" className="mt-[3px] block h-px w-12 bg-text/50" />
          <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">{intro}</p>
        </div>
      </div>

      {/* The gap above is what the map reaches down into. A visitor without a
          session has one selection only, so no tabs; the tabs' own line is
          otherwise the summary's top rule. */}
      <div className="mt-6">
        {isGuest ? null : <ViewTabs />}
        <Tally {...tally} ruled={isGuest} />
      </div>
    </header>
  )
}
