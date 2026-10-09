"use client"

import Link from "next/link"
import type { TempusPublicObservation } from "@/app/lib/dal/tempus/observations"
import { formatUserName } from "@/app/lib/format-user-name"
import { Chip } from "@/app/components/ui/Chip"
import { formatDateLongOrNull } from "@/app/lib/formatters"
import { LABEL } from "./styles"

const STEP = "inline-block no-underline transition-colors active:translate-y-px text-text-muted hover:text-text"

// The latest finds from every user, newest first. Every row links to its observation.
export function ObservationsSection({
  observations,
  page,
  pageCount,
  query,
}: {
  observations: TempusPublicObservation[]
  page: number
  pageCount: number
  // The page's other choices as a query string, kept when the page of finds changes.
  query: string
}) {
  const hrefFor = (target: number) => {
    const params = new URLSearchParams(query)
    if (target > 1) params.set("obs", String(target))
    const text = params.toString()
    return text ? `/?${text}` : "/"
  }

  if (observations.length === 0) {
    return <p className="border-y border-border py-14 text-center text-sm text-text-muted">Inga observationer har rapporterats ännu.</p>
  }

  return (
    <section>
      <div className="hidden grid-cols-3 items-center gap-3 border-b border-border/70 py-2 font-mono text-[10px] uppercase tracking-[.16em] text-text-faint sm:grid">
        <span>Art</span>
        <span>Datum och observatör</span>
        <span className="text-right">Antal</span>
      </div>

      <ul className="divide-y divide-border border-b border-border">
        {observations.map((observation) => {
          const name = observation.species_detail.swedish_name
          return (
            <li key={observation.id}>
              <Link
                href={`/observationer/${observation.id}`}
                aria-label={`Visa observation av ${name}`}
                className="group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3.5 no-underline transition-colors hover:bg-accent-wash/20 sm:grid-cols-3 sm:py-4"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-semibold tracking-tight text-text sm:text-lg">{name}</span>
                </span>
                <span className="col-span-2 row-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tracking-wide text-text-muted sm:col-span-1 sm:row-start-auto">
                  <span>{formatDateLongOrNull(observation.observed_at) ?? "Utan datum"}</span>
                  <Chip variant="neutral" className="px-2 py-0.5 text-[10px]">{formatUserName(observation)}</Chip>
                </span>
                {observation.count ? (
                  <span className="shrink-0 text-right font-mono text-xs text-text-muted">{observation.count} ex</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>

      {pageCount > 1 ? (
        <nav aria-label="Observationer, sidor" className={`mt-6 flex items-center justify-center gap-5 ${LABEL}`}>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} scroll={false} className={STEP}>‹ Föregående</Link>
          ) : (
            <span className="text-text-faint">‹ Föregående</span>
          )}
          <span className="text-text-faint">Sida {page}</span>
          {page < pageCount ? (
            <Link href={hrefFor(page + 1)} scroll={false} className={STEP}>Nästa ›</Link>
          ) : (
            <span className="text-text-faint">Nästa ›</span>
          )}
        </nav>
      ) : null}
    </section>
  )
}
