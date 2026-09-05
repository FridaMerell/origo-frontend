import Link from "next/link"
import type { TempusSeasonalOverview } from "@/app/lib/dal"
import { activeMonths, activeMonthsForWindow, habitatSummary, speciesName, statusHint, STATUS_META, MONTHS, type HomeSpecies } from "./season-helpers"

function PhenoStrip({
  months,
  currentMonth,
  tone,
}: {
  months: Set<number>
  currentMonth: number
  tone: "accent" | "secondary"
}) {
  return (
    <span className="grid grid-cols-12 gap-1" role="img" aria-label="Artens aktiva månader">
      {MONTHS.map((month, index) => (
        <span key={`${month}-${index}`} className="flex flex-col items-center gap-0.5">
          <span
            className={`block h-2.5 w-full border ${
              months.has(index)
                ? tone === "accent"
                  ? "border-accent bg-accent"
                  : "border-secondary bg-secondary"
                : "border-border bg-surface-2/70"
            } ${index === currentMonth ? "outline outline-offset-1 outline-text" : ""}`}
          />
          <span className="font-mono text-[9px] leading-none text-text-faint">{month}</span>
        </span>
      ))}
    </span>
  )
}

function RegisterRow({
  index,
  name,
  scientificName,
  meta,
  href,
  statusLabel,
  statusInk,
  hint,
  months,
  currentMonth,
  tone,
}: {
  index: number
  name: string
  scientificName: string | null
  meta: string
  href: string
  statusLabel: string
  statusInk: string
  hint: string | null
  months: Set<number>
  currentMonth: number
  tone: "accent" | "secondary"
}) {
  return (
    <li>
      <Link
        href={href}
        aria-label={`Visa ${name}`}
        className="block border-b border-border px-2 py-2.5 no-underline transition-colors hover:bg-surface-2/45"
      >
        <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 gap-y-1 xl:min-w-[58rem] xl:grid-cols-[2.5rem_minmax(9rem,13rem)_minmax(12rem,1fr)_minmax(9rem,12rem)_minmax(15rem,18rem)] xl:items-center xl:gap-x-4 xl:gap-y-0">
          <span className="row-span-2 self-start pt-0.5 text-right font-mono text-[12px] tabular-nums text-text-faint xl:row-span-1 xl:self-auto xl:pt-0">
            {String(index).padStart(2, "0")}
          </span>
          <span className="col-start-2 min-w-0 truncate whitespace-nowrap xl:col-auto">
            <span className="font-display text-[15px] text-text">{name}</span>
            {scientificName ? (
              <span className="ml-2 font-mono text-[11px] italic text-text-muted">{scientificName}</span>
            ) : null}
          </span>
          <span className="col-start-2 truncate text-[13px] leading-relaxed text-text-muted xl:col-auto">{meta}</span>
          <span className={`col-span-2 truncate font-display text-xs italic ${statusInk} xl:col-auto`}>
            {statusLabel}
            {hint ? <span className="text-text-faint"> · {hint}</span> : null}
          </span>
          <span className="col-span-2 min-w-0 xl:col-auto">
            <PhenoStrip months={months} currentMonth={currentMonth} tone={tone} />
          </span>
        </div>
      </Link>
    </li>
  )
}

export function SpeciesRegister({
  isAll,
  sortedItems,
  overview,
  overviewCount,
  overviewPage,
  overviewHasNext,
  overviewHasPrevious,
  registerCount,
  currentMonth,
}: {
  isAll: boolean
  sortedItems: HomeSpecies[]
  overview: TempusSeasonalOverview[]
  overviewCount: number
  overviewPage: number
  overviewHasNext: boolean
  overviewHasPrevious: boolean
  registerCount: number
  currentMonth: number
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {isAll ? "Hela urvalet" : "Följda arter"}
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[.16em] text-text-faint">
          {isAll
            ? `${overviewCount.toLocaleString("sv-SE")} arter · minst 20 rapporter`
            : registerCount > 0
              ? `${registerCount} ${registerCount === 1 ? "art" : "arter"}`
              : "0 arter"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="hidden min-w-[58rem] grid-cols-[2.5rem_minmax(9rem,13rem)_minmax(12rem,1fr)_minmax(9rem,12rem)_minmax(15rem,18rem)] gap-x-4 border-b border-border px-2 py-1.5 font-mono text-[10px] uppercase tracking-[.14em] text-text-faint xl:grid">
          <span className="text-right">Nr</span>
          <span>Art</span>
          <span>{isAll ? "Underlag" : "Livsmiljö"}</span>
          <span>Status</span>
          <span>Aktiv period</span>
        </div>

        {isAll ? (
        overview.length > 0 ? (
          <ol>
            {overview.map((item, index) => {
              const meta = STATUS_META[item.seasonal_status.status]
              const days = item.seasonal_status.is_coming_into_season
                ? item.seasonal_status.days_until_start
                : item.seasonal_status.is_going_out_of_season
                  ? item.seasonal_status.days_until_end
                  : null
              return (
                <RegisterRow
                  key={item.id}
                  index={index + 1 + (overviewPage - 1) * 24}
                  name={item.swedish_name?.trim() || item.scientific_name}
                  scientificName={item.swedish_name ? item.scientific_name : null}
                  meta={`${item.record_count.toLocaleString("sv-SE")} rapporter · v. ${item.activity_window.start_week}–${item.activity_window.end_week}`}
                  href={`/taxa/oversikt/${item.dyntaxa_taxon_id}`}
                  statusLabel={meta.label}
                  statusInk={meta.ink}
                  hint={days != null ? `${days} d` : null}
                  months={activeMonthsForWindow(item.activity_window)}
                  currentMonth={currentMonth}
                  tone="secondary"
                />
              )
            })}
          </ol>
        ) : (
          <p className="border-b border-border px-2 py-12 text-center text-sm text-text-muted">
            Inga arter med minst 20 rapporter hittades för det valda området.
          </p>
        )
      ) : sortedItems.length > 0 ? (
        <ol>
          {sortedItems.map((species, index) => {
            const status = species.seasonal_status
            const meta = STATUS_META[status.status]
            return (
              <RegisterRow
                key={species.id}
                index={index + 1}
                name={speciesName(species)}
                scientificName={species.swedish_name ? species.scientific_name : null}
                meta={habitatSummary(species)}
                href={`/taxa/foljda/${species.dyntaxa_taxon_id}`}
                statusLabel={meta.label}
                statusInk={meta.ink}
                hint={statusHint(status)}
                months={activeMonths(species)}
                currentMonth={currentMonth}
                tone="accent"
              />
            )
          })}
        </ol>
      ) : (
        <div className="border-b border-border">
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
        </div>
        )}
      </div>

      {/* Förklaring */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border border-border bg-surface-2/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[.13em] text-text-faint">
        <span className="text-text-muted">Förklaring</span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`inline-block size-2.5 border ${isAll ? "border-secondary bg-secondary" : "border-accent bg-accent"}`}
          />
          aktiv månad
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-2 border border-border bg-surface-2 outline outline-offset-1 outline-text"
          />
          innevarande månad
        </span>
        <span className="flex flex-wrap items-center gap-x-3">
          <span className="text-text-muted">Status:</span>
          <span className="text-accent">i säsong</span>
          <span className="text-secondary">på väg in</span>
          <span className="text-warning">på väg ut</span>
        </span>
      </div>

      {isAll && (overviewHasPrevious || overviewHasNext) ? (
        <nav
          className="mt-5 flex items-center justify-center gap-5 border-t border-border pt-4 font-mono text-[11px] uppercase tracking-[.14em]"
          aria-label="Sidnavigering för hela urvalet"
        >
          {overviewHasPrevious ? (
            <Link href={`/?view=all&p=${overviewPage - 1}`} className="text-text-muted no-underline hover:text-text">
              ‹ Föregående
            </Link>
          ) : (
            <span className="text-text-faint">‹ Föregående</span>
          )}
          <span className="text-text-faint">Sida {overviewPage}</span>
          {overviewHasNext ? (
            <Link href={`/?view=all&p=${overviewPage + 1}`} className="text-text-muted no-underline hover:text-text">
              Nästa ›
            </Link>
          ) : (
            <span className="text-text-faint">Nästa ›</span>
          )}
        </nav>
      ) : null}
    </section>
  )
}
