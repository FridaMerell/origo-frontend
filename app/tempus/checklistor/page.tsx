import type { Metadata } from "next"
import Link from "next/link"
import { getTempusChecklists } from "@/app/lib/dal"

export const metadata: Metadata = {
  title: "Checklistor | Tempus",
  description: "Dina artchecklistor för områden, inventeringar och utflykter.",
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
}

export default async function ChecklistsPage() {
  const checklists = await getTempusChecklists({ ordering: "-created_at" })

  return (
    <div className="container mx-auto flex flex-col gap-4 py-5 max-sm:px-4 sm:py-7">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <div className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">
            Checklistor
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Dina checklistor
          </h1>
        </div>
        <Link
          href="/checklistor/ny"
          className="inline-flex items-center gap-2 rounded-none border border-border bg-transparent px-4 py-2.5 font-display text-sm font-medium italic tracking-wide text-accent no-underline hover:text-accent-hover"
        >
          Ny checklista
        </Link>
      </header>

      {checklists.length === 0 ? (
        <section className="flex flex-col items-center gap-3 border-y border-border py-14 text-center">
          <p className="text-sm text-text-muted">Du har inga checklistor än.</p>
          <Link href="/checklistor/ny" className="text-sm font-medium text-accent hover:text-accent-hover">
            Skapa din första checklista
          </Link>
        </section>
      ) : (
        <section>
          <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(12rem,1fr)_7rem_minmax(12rem,1fr)] border-b border-border py-2 font-mono text-[10px] uppercase tracking-[.16em] text-text-faint max-sm:hidden">
            <span>Checklista</span>
            <span>Beskrivning</span>
            <span className="text-right">Arter</span>
            <span className="text-right">Område / tid</span>
          </div>
          <ul className="divide-y divide-border border-b border-border">
          {checklists.map((checklist) => {
            const count =
              checklist.species_count ??
              checklist.item_count ??
              checklist.items?.length ??
              0
            const startDate = formatDate(checklist.start_date)
            const endDate = formatDate(checklist.end_date)
            const dateRange = startDate
              ? endDate && endDate !== startDate
                ? `${startDate} – ${endDate}`
                : startDate
              : endDate
            return (
              <li key={checklist.id}>
                <Link
                  href={`/checklistor/${checklist.id}`}
                  className="grid gap-2 py-4 no-underline transition-colors hover:bg-surface-2/40 sm:grid-cols-[minmax(0,1.5fr)_minmax(12rem,1fr)_7rem_minmax(12rem,1fr)] sm:items-center sm:gap-3"
                >
                  <span className="min-w-0 font-display text-base font-semibold tracking-tight text-text sm:text-lg">
                    <span className="block truncate">{checklist.name}</span>
                  </span>
                  <span className="line-clamp-2 text-sm text-text-muted">
                    {checklist.description || "—"}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-text-muted sm:text-right">
                    {count} {count === 1 ? "art" : "arter"}
                  </span>
                  <span className="text-sm text-text-muted sm:text-right">
                    {checklist.geo_area_name || "—"}
                    {dateRange ? <span className="block text-xs text-text-faint">{dateRange}</span> : null}
                  </span>
                </Link>
              </li>
            )
          })}
          </ul>
        </section>
      )}
    </div>
  )
}
