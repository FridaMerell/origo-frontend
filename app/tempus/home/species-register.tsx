"use client"

import Link from "next/link"
import type { SpeciesList } from "./overview-data"
import { useOverview } from "./overview-provider"
import { PageSteps } from "./page-steps"
import { activeMonths, speciesHref, speciesName, STATUS_META, MONTHS, type HomeSpecies } from "./season-helpers"
import type { HomeViewName } from "./selection"
import { LABEL, pending } from "./styles"

// Art, vetenskapligt namn, årsfenologi: thirds, like the summary's figures
// above, and the same in the header as in every row.
const COLUMNS = "grid grid-cols-1 gap-x-8 px-4 md:grid-cols-3 md:items-center"

// The phenogram's place in its column: its original width, at the column's right edge.
const STRIP = "w-full md:max-w-72 md:justify-self-end"

// The phenogram, as it was drawn from the start: the year as twelve month
// cells with each month's letter under its cell. Active months are filled in
// the status colour and the current month is outlined.
function PhenoStrip({ species, currentMonth }: { species: HomeSpecies; currentMonth: number }) {
  const status = STATUS_META[species.seasonal_status.status]
  const months = activeMonths(species.activity_window)
  return (
    <span className={`grid grid-cols-12 gap-1 ${STRIP}`} role="img" aria-label={`Aktiva månader. ${status.label}.`}>
      {MONTHS.map((month, index) => (
        <span key={`${month}-${index}`} className="flex flex-col items-center gap-0.5">
          <span
            className={`block h-2.5 w-full border ${months.has(index) ? status.fill : "border-border bg-surface-2/70"} ${
              index === currentMonth ? "outline outline-offset-1 outline-text" : ""
            }`}
          />
          <span className="font-mono text-[9px] leading-none text-text-faint transition-colors duration-150 group-hover/row:text-text">{month}</span>
        </span>
      ))}
    </span>
  )
}

function RegisterHeader() {
  return (
    <div className={`max-md:hidden border-b border-text py-2.5 text-text ${LABEL} ${COLUMNS}`}>
      <span>Art</span>
      <span>Vetenskapligt namn</span>
      <span className={STRIP}>Aktiv period</span>
    </div>
  )
}

function RegisterRow({ species, view, currentMonth }: { species: HomeSpecies; view: HomeViewName; currentMonth: number }) {
  const name = speciesName(species)
  return (
    <Link
      href={speciesHref(species, view)}
      aria-label={`Visa ${name}`}
      // A very faint tint on the row under the pointer; the month letters darken with it.
      className={`group/row min-w-0 gap-y-1.5 border-b border-border py-3 no-underline transition-colors hover:bg-surface-2/40 ${COLUMNS}`}
    >
      <span className="min-w-0 truncate font-display text-base text-text transition-colors duration-150 group-hover/row:text-accent">{name}</span>
      <span className="min-w-0 truncate font-mono text-[11px] italic text-text-muted">
        {species.swedish_name ? species.scientific_name : null}
      </span>
      <PhenoStrip species={species} currentMonth={currentMonth} />
    </Link>
  )
}

function EmptyRegister({ view }: { view: HomeViewName }) {
  if (view === "all") {
    return (
      <p className="px-4 py-12 text-center text-sm text-text-muted">
        Inga arter med minst 20 rapporter hittades för det valda området.
      </p>
    )
  }
  return (
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
  )
}

function Legend() {
  return (
    <div className={`mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 text-text-muted ${LABEL}`}>
      <span className="text-text">Förklaring</span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-block size-2.5 border border-text-muted bg-text-muted" />
        aktiv månad, färgad efter status
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="inline-block size-2 border border-border bg-surface-2 outline outline-offset-1 outline-text" />
        innevarande månad
      </span>
      <span className="flex flex-wrap items-center gap-x-3">
        <span className="text-text">Status:</span>
        <span className="text-accent">i säsong</span>
        <span className="text-secondary">på väg in</span>
        <span className="text-warning">på väg ut</span>
      </span>
    </div>
  )
}

// The species as a framed table, with its legend and paging.
export function SpeciesRegister({ list, view, currentMonth }: { list: SpeciesList; view: HomeViewName; currentMonth: number }) {
  const { page } = useOverview().selection

  return (
    <>
      <div aria-busy={list.loading} className={`border border-text ${pending(list.loading)}`}>
        <RegisterHeader />
        {list.rows.length > 0 ? (
          <ol className="[&>li:last-child>*]:border-b-0">
            {list.rows.map((species) => (
              <li key={species.id}>
                <RegisterRow species={species} view={view} currentMonth={currentMonth} />
              </li>
            ))}
          </ol>
        ) : list.loading ? (
          <p className="px-4 py-12 text-center text-sm text-text-muted">Hämtar arter…</p>
        ) : (
          <EmptyRegister view={view} />
        )}
      </div>

      <Legend />

      {view === "all" ? (
        <p className="mt-3 max-w-3xl px-4 text-sm leading-relaxed text-text-muted">
          Urvalet omfattar arter med minst 20 rapporter i valt område. Arter med färre rapporter ingår därför inte i totalsiffran.
          Lågkonfidensarter kan fortfarande ingå om de uppfyller rapportgränsen.
        </p>
      ) : null}

      <PageSteps field="page" page={page} hasPrevious={list.hasPrevious} hasNext={list.hasNext} label="Registret, sidor" />
    </>
  )
}
