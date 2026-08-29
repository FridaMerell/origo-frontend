import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/app/components/ui/Card"
import { Icon } from "@/app/components/ui/Icon"
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
    <div className="container mx-auto flex flex-col gap-6 py-6 max-sm:px-4 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-accent">
            <Icon name="list-checks" size={14} />
            Checklistor
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Dina checklistor
          </h1>
        </div>
        <Link
          href="/checklistor/ny"
          className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast no-underline hover:bg-accent-hover"
        >
          <Icon name="plus" size={16} />
          Ny checklista
        </Link>
      </header>

      {checklists.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-accent">
            <Icon name="list-checks" size={22} />
          </span>
          <p className="text-sm text-text-muted">Du har inga checklistor än.</p>
          <Link href="/checklistor/ny" className="text-sm font-medium text-accent hover:text-accent-hover">
            Skapa din första checklista
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <Link href={`/checklistor/${checklist.id}`} className="block h-full no-underline">
                  <Card className="flex h-full flex-col gap-3 transition-colors hover:border-border-strong">
                    <h2 className="font-display text-lg font-semibold">{checklist.name}</h2>
                    {checklist.description ? (
                      <p className="line-clamp-2 text-sm text-text-muted">{checklist.description}</p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wide text-text-muted">
                      <span>{count} {count === 1 ? "art" : "arter"}</span>
                      {checklist.geo_area_name ? (
                        <span className="flex items-center gap-1">
                          <Icon name="map-pin" size={12} />
                          {checklist.geo_area_name}
                        </span>
                      ) : null}
                      {dateRange ? (
                        <span className="flex items-center gap-1">
                          <Icon name="calendar" size={12} />
                          {dateRange}
                        </span>
                      ) : null}
                    </div>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
