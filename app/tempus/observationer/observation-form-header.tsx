"use client"

import type { TempusSpecies } from "@/app/lib/dal"
import { BiotopeMap, biotopePropsFromSpecies } from "@/app/tempus/ui/biotope-map/BiotopeMap"

export function ObservationFormHeader({ mapSpecies }: { mapSpecies: TempusSpecies | undefined }) {
  return (
    <header className="px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
      <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
        <span>Observationsförteckning</span>
        <span>Ny införsel</span>
      </div>

      <div className="grid border-b border-border sm:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="flex min-h-24 flex-col items-center justify-center px-3 py-3 text-center sm:py-4">
          <h1 className="font-display text-2xl font-medium italic tracking-wide sm:text-3xl">Ny observation</h1>
          <p className="mt-1 font-display text-xs italic leading-5 text-text-muted">
            Sök upp en eller flera arter och för in dem i samma fältprotokoll.
          </p>
        </div>
        <div className="relative min-h-24 overflow-hidden border-t border-border bg-surface-2/25 sm:border-l sm:border-t-0">
          <BiotopeMap
            {...(mapSpecies ? biotopePropsFromSpecies(mapSpecies) : { seed: "Ny observation" })}
            detail={7}
            relief={6}
            waterStrength={4}
            featureAmount={3}
            compass
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full opacity-45"
            style={{ width: "100%", height: "100%" }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-surface/75 via-transparent to-transparent" />
          <span className="absolute bottom-1.5 left-2 font-display text-[9px] italic text-text-muted">
            Biotopskiss{mapSpecies ? ` · ${mapSpecies.scientific_name}` : ""}
          </span>
        </div>
      </div>
    </header>
  )
}
