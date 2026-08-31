import type { Metadata } from "next"
import Link from "next/link"
import { Chip } from "@/app/components/ui/Chip"
import {
  getTempusChecklistItems,
  getTempusChecklists,
  getTempusObservations,
  getTempusSpeciesItems,
} from "@/app/lib/dal"

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
  const [observations, checklists] = await Promise.all([
    getTempusObservations({ ordering: "-observed_at" }),
    getTempusChecklists(),
  ])
  const speciesIds = [...new Set(observations.map((observation) => observation.species))]
  const species = await getTempusSpeciesItems(speciesIds)
  const speciesById = new Map(species.map((item) => [item.id, item]))
  const checklistItems = await Promise.all(
    checklists.map(async (checklist) => ({
      checklist,
      items: checklist.items ?? (await getTempusChecklistItems(checklist.id)),
    })),
  )
  const checklistNameByItemId = new Map(
    checklistItems.flatMap(({ checklist, items }) =>
      items.map((item) => [item.id, checklist.name] as const),
    ),
  )

  return (
    <div className="container mx-auto flex flex-col gap-4 py-5 max-sm:px-4 sm:py-7">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <div className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">
            Observationer
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Dina observationer
          </h1>
          <p className="mt-1 text-sm text-text-muted">Dina registrerade fynd.</p>
        </div>
        <Link
          href="/observationer/ny"
          className="inline-flex items-center gap-2 rounded-none border border-border bg-transparent px-4 py-2.5 font-display text-sm font-medium italic tracking-wide text-accent no-underline hover:text-accent-hover"
        >
          Ny observation
        </Link>
      </header>

      {observations.length === 0 ? (
        <section className="flex flex-col items-center gap-3 border-y border-border py-14 text-center">
          <p className="text-sm text-text-muted">Du har inga observationer än.</p>
          <Link href="/observationer/ny" className="text-sm font-medium text-accent hover:text-accent-hover">
            Registrera din första observation
          </Link>
        </section>
      ) : (
        <section>
          <div className="flex items-baseline justify-between border-b border-border pb-3">
            <h2 className="font-display text-lg font-semibold">Senaste fynd</h2>
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-text-muted">
              {observations.length} poster
            </p>
          </div>

          <div className="hidden grid-cols-3 items-center gap-3 border-b border-border/70 py-2 font-mono text-[10px] uppercase tracking-[.16em] text-text-faint sm:grid">
            <span>Art</span>
            <span>Datum och anteckning</span>
            <span className="text-right">Antal</span>
            <span />
          </div>

          <ul className="divide-y divide-border border-b border-border">
            {observations.map((observation) => {
              const match = speciesById.get(observation.species)
              const observedAt = formatDate(observation.observed_at)
              const checklistNames = [
                ...new Set(
                  observation.checklist_items
                    .map((itemId) => checklistNameByItemId.get(itemId))
                    .filter((name): name is string => Boolean(name)),
                ),
              ]
              return (
                <li key={observation.id}>
                  <Link
                    href={`/observationer/${observation.id}`}
                    className="group grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3.5 no-underline transition-colors hover:bg-accent-wash/20 sm:grid-cols-3 sm:py-4"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-semibold tracking-tight text-text sm:text-lg">
                        {match ? match.swedish_name || match.scientific_name : "Okänd art"}
                      </span>
                    </span>
                    <span className="col-span-2 row-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tracking-wide text-text-muted sm:col-span-1 sm:row-start-auto">
                      <span>{observedAt ?? "Utan datum"}</span>
                      {checklistNames.map((name) => (
                        <Chip key={name} variant="neutral" className="px-2 py-0.5 text-[10px]">
                          {name}
                        </Chip>
                      ))}
                    </span>
                    {observation.count ? (
                      <span className="shrink-0 text-right font-mono text-xs text-text-muted">
                        {observation.count} ex
                      </span>
                    ) : null}
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
