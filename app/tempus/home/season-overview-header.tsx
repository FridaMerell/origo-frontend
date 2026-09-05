import Link from "next/link"
import { BiotopeMap } from "../ui/biotope-map"
import { biotopePropsFromSpecies } from "../ui/biotope-map/BiotopeMap"
import { CornerTicks } from "./corner-ticks"
import type { HomeSpecies } from "./season-helpers"

type TallyCell = { label: string; value: number; lead: boolean }
type Habitat = { count: number; name: string; species: HomeSpecies }

export function SeasonOverviewHeader({
  areaName,
  todayLabel,
  view,
  tally,
  habitat,
  habitatNote,
}: {
  areaName: string
  todayLabel: string
  view: "followed" | "all"
  tally: TallyCell[]
  habitat: Habitat | null
  habitatNote: string
}) {
  const isAll = view === "all"

  return (
    <header className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 font-mono text-[11px] uppercase tracking-[.18em] text-text-faint">
        <span className="text-text-muted">{areaName}</span>
        <span>{todayLabel}</span>
      </div>

      <div className={`grid gap-6 sm:items-start ${habitat ? "sm:grid-cols-[minmax(0,1fr)_16rem]" : ""}`}>
        <div>
          <h1 className="font-display text-[2rem] font-semibold tracking-tight text-text sm:text-4xl lg:text-5xl">
            Säsongsöversikt
          </h1>
          <span aria-hidden="true" className="mt-3 block h-px w-20 bg-text" />
          <span aria-hidden="true" className="mt-[3px] block h-px w-12 bg-text/50" />
          <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
            {isAll
              ? "Rapportstarka arter för området och var i sin årscykel de befinner sig just nu."
              : "Arterna du bevakar, ordnade efter var i sin årscykel de befinner sig just nu."}
          </p>
        </div>

        {habitat ? (
          <figure className="min-w-0">
            <div className="relative aspect-[8/5] overflow-hidden border border-border bg-surface-2/40">
              <BiotopeMap
                {...biotopePropsFromSpecies(habitat.species)}
                width={800}
                height={500}
                compass
                aria-hidden="true"
                className="absolute inset-0 size-full!"
              />
              <CornerTicks />
            </div>
            <figcaption className="mt-2">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="flex h-1.5 w-16 border border-text">
                  <span className="flex-1 bg-text" />
                  <span className="flex-1" />
                  <span className="flex-1 bg-text" />
                  <span className="flex-1" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[.14em] text-text">{habitat.name}</span>
              </span>
              <span className="mt-1 block font-display text-sm italic text-text-muted">{habitatNote}</span>
            </figcaption>
          </figure>
        ) : null}
      </div>

      {/* Index-flikar */}
      <nav aria-label="Urval" className="flex items-end gap-6 border-b border-border">
        <Link
          href="/"
          aria-current={view === "followed" ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2 font-mono text-[12px] uppercase tracking-[.16em] no-underline ${
            view === "followed"
              ? "border-accent text-text"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Följda arter
        </Link>
        <Link
          href="/?view=all"
          aria-current={view === "all" ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2 font-mono text-[12px] uppercase tracking-[.16em] no-underline ${
            view === "all"
              ? "border-accent text-text"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Hela urvalet
        </Link>
      </nav>

      {/* Summering */}
      <dl className="grid grid-cols-3 border-y border-border divide-x divide-border">
        {tally.map((cell) => (
          <div key={cell.label} className="px-2.5 py-3 sm:px-4">
            <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-text-faint sm:text-[11px] sm:tracking-[.16em]">{cell.label}</dt>
            <dd
              className={`mt-1 font-display text-2xl font-semibold tabular-nums sm:text-3xl ${
                cell.lead ? "text-accent" : "text-text"
              }`}
            >
              {cell.value.toLocaleString("sv-SE")}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
