import type { Metadata } from "next"
import Link from "next/link"
import { Card } from "@/app/components/ui/Card"
import { Icon } from "@/app/components/ui/Icon"
import { getTempusObservations, getTempusSpeciesItems } from "@/app/lib/dal"

export const metadata: Metadata = {
  title: "Observationer | Tempus",
  description: "Dina artobservationer.",
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
}

export default async function ObservationsPage() {
  const observations = await getTempusObservations({ ordering: "-observed_at" })
  const speciesIds = [...new Set(observations.map((observation) => observation.species))]
  const species = await getTempusSpeciesItems(speciesIds)
  const speciesById = new Map(species.map((item) => [item.id, item]))

  return (
    <div className="container mx-auto flex flex-col gap-6 py-6 max-sm:px-4 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-accent">
            <Icon name="binoculars" size={14} />
            Observationer
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Dina observationer
          </h1>
        </div>
        <Link
          href="/observationer/ny"
          className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast no-underline hover:bg-accent-hover"
        >
          <Icon name="plus" size={16} />
          Ny observation
        </Link>
      </header>

      {observations.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-accent">
            <Icon name="binoculars" size={22} />
          </span>
          <p className="text-sm text-text-muted">Du har inga observationer än.</p>
          <Link href="/observationer/ny" className="text-sm font-medium text-accent hover:text-accent-hover">
            Registrera din första observation
          </Link>
        </Card>
      ) : (
        <Card className="p-0">
          <ul>
            {observations.map((observation) => {
              const match = speciesById.get(observation.species)
              const observedAt = formatDate(observation.observed_at)
              return (
                <li key={observation.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/observationer/${observation.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 no-underline hover:bg-accent-wash"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">
                        {match ? match.swedish_name || match.scientific_name : "Okänd art"}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-text-muted">
                        {observedAt ?? "Utan datum"}
                        {observation.checklist_items.length > 0
                          ? ` · ${observation.checklist_items.length} checklistrad${observation.checklist_items.length === 1 ? "" : "er"}`
                          : ""}
                      </span>
                    </span>
                    {observation.count ? (
                      <span className="shrink-0 rounded bg-surface-2 px-2 py-0.5 font-mono text-xs text-text-muted">
                        {observation.count} ex
                      </span>
                    ) : null}
                    <Icon name="chevron-right" size={15} className="shrink-0 text-text-faint" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
