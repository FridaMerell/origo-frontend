"use client"

import Link from "next/link"
import type { TempusSeasonalLandscape } from "@/app/lib/dal"
import { landscapeScene } from "./landscape-helpers"
import { MapBackdrop } from "./map-backdrop"
import type { HomeData } from "./overview-data"
import { SelectionLink } from "./selection-link"
import { formatCount, STATUS_META, speciesHref, speciesName, type HomeSpecies } from "./season-helpers"
import { LABEL, ROW_HOVER } from "./styles"

function LandscapeSpecies({ species, number }: { species: HomeSpecies; number: number }) {
  const status = STATUS_META[species.seasonal_status.status]
  return (
    <Link
      href={speciesHref(species, "all")}
      aria-label={`Visa ${speciesName(species)}`}
      className={`group/entry -mx-2 grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-3 px-2 py-1 no-underline ${ROW_HOVER}`}
    >
      <span className="text-right font-mono text-[12px] tabular-nums text-text-faint">{String(number).padStart(2, "0")}</span>
      <span className="min-w-0 truncate whitespace-nowrap">
        <span className="font-display text-[15px] text-text transition-colors duration-150 group-hover/entry:text-accent">
          {speciesName(species)}
        </span>
        {species.swedish_name ? (
          <span className="ml-2 font-mono text-[11px] italic text-text-muted">{species.scientific_name}</span>
        ) : null}
      </span>
      <span className={`${LABEL} ${status.ink}`}>{status.label}</span>
    </Link>
  )
}

// One landscape type: its name and count on the left, its most interesting
// species in the middle and its biotope map coming in from the right.
function LandscapeRow({ landscape, areaName }: { landscape: TempusSeasonalLandscape; areaName: string }) {
  return (
    <div className="relative min-h-34 border-b border-border px-2 py-5">
      <figure className="pointer-events-none absolute inset-y-0 right-0 hidden w-[54%] overflow-hidden sm:block">
        <MapBackdrop ink="row" biotope={landscapeScene(landscape.name)} seed={`${areaName} ${landscape.name}`} />
      </figure>

      <div className="relative grid items-start gap-x-8 gap-y-3 sm:grid-cols-[13rem_minmax(0,30rem)]">
        <div>
          <h3 className="font-display text-[22px] font-semibold leading-[1.3] tracking-tight">{landscape.name}</h3>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[.14em] text-text-faint">
            {formatCount(landscape.count)} aktuella
          </span>
          {/* Opens the list narrowed to this landscape type. */}
          <SelectionLink
            change={{ landscapeType: landscape.name }}
            className={`mt-3.5 inline-block text-text-muted no-underline transition-colors hover:text-text active:translate-y-px ${LABEL}`}
          >
            Visa alla ›
          </SelectionLink>
        </div>

        <ol>
          {landscape.species.map((species, index) => (
            <li key={species.id}>
              <LandscapeSpecies species={species} number={index + 1} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

// The whole selection read per landscape type: one open row for each type.
export function LandscapeRows({ landscapes, areaName }: { landscapes: HomeData["landscapes"]; areaName: string }) {
  if (landscapes.shown.length === 0) {
    return (
      <p className="border-b border-border px-2 py-12 text-center text-sm text-text-muted">
        {landscapes.loading ? "Hämtar miljöer…" : "Inga aktuella arter med känd landskapstyp hittades för det valda området."}
      </p>
    )
  }

  return (
    <>
      {landscapes.shown.map((landscape) => (
        <LandscapeRow key={landscape.name} landscape={landscape} areaName={areaName} />
      ))}
      <p className="mt-3 text-xs leading-relaxed text-text-muted">
        En art visas under varje landskapstyp där den har stor betydelse, så samma art kan stå under flera miljöer och
        antalen går inte ihop till totalen.
      </p>
    </>
  )
}
