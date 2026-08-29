import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Icon } from "@/app/components/ui/Icon"
import {
  getTempusChecklistItem,
  getTempusChecklistItems,
  getTempusObservations,
  getTempusSpecies,
} from "@/app/lib/dal"
import { BiotopeMap, biotopePropsFromSpecies } from "@/app/tempus/ui/biotope-map/BiotopeMap"
import ChecklistActions from "./checklist-actions"
import ObservationMapDialog from "./observation-map-dialog"

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const checklist = await getTempusChecklistItem(id)
  return { title: checklist ? `${checklist.name} | Checklistor` : "Checklista" }
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
}

export default async function ChecklistDetailPage({ params }: PageProps) {
  const { id } = await params
  const checklist = await getTempusChecklistItem(id)
  if (!checklist) notFound()

  const [items, species, observations] = await Promise.all([
    checklist.items ?? getTempusChecklistItems(id),
    getTempusSpecies(),
    getTempusObservations({ ordering: "-observed_at" }),
  ])
  const speciesById = new Map(species.map((item) => [item.id, item]))
  const sortedItems = [...items].sort((a, b) => a.sequence - b.sequence)
  const mapSpecies = sortedItems.map((item) => speciesById.get(item.species)).find(Boolean)
  const startDate = formatDate(checklist.start_date)
  const endDate = formatDate(checklist.end_date)
  const dateRange = startDate
    ? endDate && endDate !== startDate
      ? `${startDate} – ${endDate}`
      : startDate
    : endDate
  const observationPoints = observations.flatMap((observation) => {
    if (!("coordinates" in observation.location)) return []
    const [longitude, latitude] = observation.location.coordinates
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return []
    const match = speciesById.get(observation.species)
    const speciesName = match?.swedish_name || match?.scientific_name || "Okänd art"
    const observedAt = formatDate(observation.observed_at)
    return [{
      id: observation.id,
      coordinates: [longitude, latitude] as const,
      label: `${speciesName}${observedAt ? ` · ${observedAt}` : ""}`,
    }]
  })

  return (
    <div className="container mx-auto py-5 max-sm:px-3 sm:py-7">
      <input id="checklist-columns" type="checkbox" className="peer sr-only" />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 peer-checked:[&_.show-one]:inline peer-checked:[&_.show-two]:hidden">
        <Link
          href="/checklistor"
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent"
        >
          <Icon name="chevron-left" size={13} />
          Checklistor
        </Link>
        <div className="flex items-center gap-4">
          <ChecklistActions id={checklist.id} name={checklist.name} />
          <label
            htmlFor="checklist-columns"
            className="hidden cursor-pointer items-center gap-1.5 border-l border-border pl-4 font-mono text-[9px] uppercase tracking-[.14em] text-text-muted hover:text-text sm:inline-flex"
          >
            <Icon name="columns-2" size={13} />
            <span className="show-two">2 kolumner</span>
            <span className="show-one hidden">1 kolumn</span>
          </label>
        </div>
      </div>

      <article className="relative overflow-hidden rounded-card border border-border bg-surface text-text shadow-card sm:peer-checked:[&_.double-header]:grid sm:peer-checked:[&_.register-check]:col-start-2 sm:peer-checked:[&_.register-check]:row-start-1 sm:peer-checked:[&_.register-list]:grid sm:peer-checked:[&_.register-list]:grid-cols-2 sm:peer-checked:[&_.register-name]:col-start-3 sm:peer-checked:[&_.register-name]:row-start-1 sm:peer-checked:[&_.register-notes]:hidden sm:peer-checked:[&_.register-row]:grid-cols-[2rem_2.5rem_minmax(0,1fr)] sm:peer-checked:[&_.register-taxon]:hidden sm:peer-checked:[&_.single-header]:hidden">
        <header className="relative px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
          <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
            <span>Fältförteckning</span>
            <span>Blad {String(sortedItems.length).padStart(3, "0")}</span>
          </div>

          <div className="grid border-b border-border sm:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="px-2 py-3 text-center sm:py-4">
              <h1 className="font-display text-2xl font-medium italic tracking-wide sm:text-3xl">
                {checklist.name}
              </h1>
              {checklist.description ? (
                <p className="mx-auto mt-1 max-w-xl font-display text-xs italic leading-5 text-text-muted">
                  {checklist.description}
                </p>
              ) : null}
            </div>
            <div className="relative min-h-24 overflow-hidden border-t border-border bg-surface-2/25 sm:border-l sm:border-t-0">
              <ObservationMapDialog
                points={observationPoints}
                caption={`Biotopskiss${mapSpecies ? ` · ${mapSpecies.scientific_name}` : ""}`}
              >
                <BiotopeMap
                  {...(mapSpecies ? biotopePropsFromSpecies(mapSpecies) : { seed: checklist.name })}
                  detail={7}
                  relief={6}
                  waterStrength={4}
                  featureAmount={3}
                  compass
                  preserveAspectRatio="xMidYMid slice"
                  className="absolute inset-0 h-full w-full opacity-45"
                  style={{ width: "100%", height: "100%" }}
                />
              </ObservationMapDialog>
            </div>
          </div>

          <dl className="grid border-b border-border font-display text-[11px] sm:grid-cols-[.7fr_1.15fr_1.5fr]">
            <div className="flex min-w-0 gap-2 border-b border-border px-3 py-1.5 sm:border-b-0 sm:border-r">
              <dt className="shrink-0 italic text-text-faint">Poster:</dt>
              <dd>{sortedItems.length}</dd>
            </div>
            <div className="flex min-w-0 gap-2 border-b border-border px-3 py-1.5 sm:border-b-0 sm:border-r">
              <dt className="shrink-0 italic text-text-faint">Område:</dt>
              <dd className="truncate">{checklist.geo_area_name || "—"}</dd>
            </div>
            <div className="flex min-w-0 gap-2 px-3 py-1.5">
              <dt className="shrink-0 italic text-text-faint">Tid:</dt>
              <dd className="truncate">{dateRange || "—"}</dd>
            </div>
          </dl>
        </header>

        <section className="px-3 pb-3 sm:px-5 sm:pb-5">
          <div className="single-header grid grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] border-l border-t border-border font-display text-[9px] leading-tight text-text-muted sm:grid-cols-[2.75rem_minmax(12rem,1.75fr)_7rem_3.5rem_minmax(8rem,1fr)]">
            <span className="row-span-2 flex items-center justify-center border-b border-r border-border px-1 py-1.5 text-center italic">Löp.<br />nr</span>
            <span className="row-span-2 flex items-center border-b border-r border-border px-3 py-1.5 text-center italic">Artens namn och benämning</span>
            <span className="hidden items-center justify-center border-b border-r border-border px-2 py-1.5 text-center italic sm:row-span-2 sm:flex">Dyntaxa<br />taxon-nr</span>
            <span className="col-start-3 flex items-center justify-center border-b border-r border-border px-1 py-1.5 text-center italic sm:col-start-4 sm:row-span-1">Fält</span>
            <span className="hidden items-center justify-center border-b border-r border-border px-2 py-2 text-center italic sm:row-span-2 sm:flex">Särskilda<br />anmärkningar</span>
            <span className="col-start-3 row-start-2 flex items-center justify-center border-b border-r border-border px-1 py-1 text-center text-[8px] sm:col-start-4">Avpr.</span>
          </div>

          <div className="double-header hidden grid-cols-2 border-l border-t border-border font-display text-[9px] italic leading-tight text-text-muted">
            {["Vänster spalt", "Höger spalt"].map((label) => (
              <div key={label} className="grid grid-cols-[2rem_2.5rem_minmax(0,1fr)] border-b border-border last:border-l">
                <span className="flex items-center justify-center border-r border-border px-1 py-1.5">Nr</span>
                <span className="flex items-center justify-center border-r border-border px-1 py-1.5">Avpr.</span>
                <span className="flex items-center px-3 py-1.5">Artens namn</span>
              </div>
            ))}
          </div>

          <ol className="register-list border-l border-border">
          {sortedItems.map((item) => {
            const match = speciesById.get(item.species)
            const commonName = match ? match.swedish_name || match.scientific_name : "Okänd art"
            return (
              <li
                key={item.id}
                className="register-row grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] border-b border-border font-display transition-colors hover:bg-surface-2/35 sm:grid-cols-[2.75rem_minmax(12rem,1.75fr)_7rem_3.5rem_minmax(8rem,1fr)]"
              >
                <span className="flex items-start justify-end border-r border-border px-2 py-2 text-[10px] italic tabular-nums text-text-faint">
                  {item.sequence}
                </span>
                <span className="register-name min-w-0 border-r border-border px-3 py-1.5">
                  <span className="block truncate text-sm italic tracking-wide">
                    {commonName}
                  </span>
                  {match ? (
                    <span className="block truncate text-[10px] italic text-text-muted">
                      {match.scientific_name}
                    </span>
                  ) : null}
                </span>
                <span className="register-taxon hidden items-start justify-center border-r border-border px-2 py-2 text-[9px] italic tabular-nums text-text-muted sm:flex">
                  {match?.dyntaxa_taxon_id ?? "—"}
                </span>
                <label className="register-check flex cursor-pointer items-center justify-center border-r border-border">
                  <input
                    type="checkbox"
                    aria-label={`Bocka av ${commonName}`}
                    className="h-4 w-4 accent-current"
                  />
                </label>
                <span className="register-notes hidden border-r border-border px-3 py-1.5 text-[10px] italic leading-4 text-text-muted sm:block">
                  {item.notes || ""}
                </span>
              </li>
            )
          })}
          </ol>

          <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] border-b border-l border-border sm:grid-cols-[2.75rem_minmax(12rem,1.75fr)_7rem_3.5rem_minmax(8rem,1fr)]" aria-hidden="true">
            <span className="h-6 border-r border-border" />
            <span className="border-r border-border" />
            <span className="hidden border-r border-border sm:block" />
            <span className="border-r border-border" />
            <span className="hidden border-r border-border sm:block" />
          </div>

          <p className="mt-2 text-right font-display text-[9px] italic text-text-faint">
            Markeringarna är tillfälliga och sparas inte.
          </p>
        </section>
      </article>
    </div>
  )
}
