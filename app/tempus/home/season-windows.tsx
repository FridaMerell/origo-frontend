"use client"

import Link from "next/link"
import type { HomeData, SeasonWindowKind } from "./overview-data"
import { useOverview } from "./overview-provider"
import { PageSteps } from "./page-steps"
import { formatCount, speciesHref, speciesName, type HomeSpecies } from "./season-helpers"
import type { HomeViewName } from "./selection"
import { LABEL, ROW_HOVER, pending } from "./styles"

// What differs between the two lists. `sign` is written before the day count:
// days until the season starts, or days left of it.
const WINDOWS = {
  incoming: { title: "Snart i säsong", ink: "text-secondary", sign: "+", days: "days_until_start", pageField: "incomingPage" },
  outgoing: { title: "Snart ur säsong", ink: "text-warning", sign: "−", days: "days_until_end", pageField: "outgoingPage" },
} as const

const ROW = "flex items-baseline gap-4 border-b border-dotted border-text-faint py-3"

function WindowRow({ species, kind, view }: { species: HomeSpecies; kind: SeasonWindowKind; view: HomeViewName }) {
  const { ink, sign, days: field } = WINDOWS[kind]
  const days = species.seasonal_status[field]

  return (
    <Link href={speciesHref(species, view)} className={`group/entry no-underline ${ROW} ${ROW_HOVER}`}>
      <span className="min-w-0 flex-1 truncate font-display text-[17px] text-text transition-colors duration-150 group-hover/entry:text-accent">
        {speciesName(species)}
      </span>
      <span className={`shrink-0 font-mono text-[12px] tabular-nums ${ink}`}>{days == null ? "—" : `${sign}${days} d`}</span>
    </Link>
  )
}

function SeasonWindow({ kind, list, view }: { kind: SeasonWindowKind; list: HomeData["windows"][SeasonWindowKind]; view: HomeViewName }) {
  const { title, pageField } = WINDOWS[kind]
  const page = useOverview().selection[pageField]

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={`${LABEL} text-text`}>{title}</h2>
        <div className="flex items-baseline gap-3 font-mono text-[11px] tabular-nums text-text-muted">
          <span>{formatCount(list.count)} totalt</span>
          <PageSteps compact field={pageField} page={page} hasPrevious={list.hasPrevious} hasNext={list.hasNext} label={`${title}, sidor`} />
        </div>
      </div>

      <div aria-busy={list.loading} className={`mt-2 ${pending(list.loading)}`}>
        {list.rows.length > 0 ? (
          <ol>
            {list.rows.map((species) => (
              <li key={species.id}>
                <WindowRow species={species} kind={kind} view={view} />
              </li>
            ))}
          </ol>
        ) : list.loading ? null : (
          <p className={`text-sm leading-relaxed text-text-muted ${ROW}`}>{list.emptyText}</p>
        )}
      </div>
    </div>
  )
}

// Species about to enter their season, and species about to leave it.
export function SeasonWindows({ windows, view }: Pick<HomeData, "windows" | "view">) {
  return (
    <section className="grid gap-8 sm:grid-cols-2">
      <SeasonWindow kind="incoming" list={windows.incoming} view={view} />
      <SeasonWindow kind="outgoing" list={windows.outgoing} view={view} />
    </section>
  )
}
