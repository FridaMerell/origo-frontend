import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Icon } from "@/app/components/ui/Icon"
import { loadChecklistRegisterPage } from "@/app/tempus/_actions/checklists"
import {
  getTempusChecklistItem,
  getTempusObservations,
} from "@/app/lib/dal"
import { BiotopeMap } from "@/app/tempus/ui/biotope-map/BiotopeMap"
import ChecklistActions from "./checklist-actions"
import ChecklistRegister from "./checklist-register"
import ObservationMapDialog from "./observation-map-dialog"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; search?: string }>
}

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

export default async function ChecklistDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const requestedPage = Number(resolvedSearchParams.page)
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const searchQuery = resolvedSearchParams.search?.trim() ?? ""
  const checklist = await getTempusChecklistItem(id)
  if (!checklist) notFound()

  const [registerPage, observations] = await Promise.all([
    loadChecklistRegisterPage({
      checklistId: id,
      page: currentPage,
      search: searchQuery || undefined,
    }),
    getTempusObservations({ checklist: id, ordering: "-observed_at" }),
  ])
  const registerRows = registerPage.results.map((row) => ({
    id: row.id,
    sequence: row.sequence,
    species: row.species_id,
    notes: row.notes || "",
    commonName: row.swedish_name || row.scientific_name || "Okänd art",
    scientificName: row.scientific_name || null,
    taxonId: row.dyntaxa_taxon_id,
    isObserved: row.is_observed,
    observationId: row.latest_observation_id ?? undefined,
    speciesDetails: null,
    checklistNames: [checklist.name],
  }))
  const speciesNameById = new Map(
    registerPage.results.map((row) => [
      row.species_id,
      row.swedish_name || row.scientific_name || "Okänd art",
    ]),
  )
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
    const speciesName = speciesNameById.get(observation.species) || "Okänd art"
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
          ← Checklistor
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
            <span>Blad {String(currentPage).padStart(3, "0")}</span>
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
                caption="Biotopskiss"
              >
                <BiotopeMap
                  seed={checklist.name}
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
              <dd>{registerPage.count}</dd>
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
          <ChecklistRegister
            rows={registerRows}
            checklistId={id}
            checklistName={checklist.name}
            initialQuery={searchQuery}
            initialPage={currentPage}
            initialCount={registerPage.count}
            initialHasPrevious={Boolean(registerPage.previous)}
            initialHasNext={Boolean(registerPage.next)}
          />

          <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] border-b border-l border-border sm:grid-cols-[2.75rem_minmax(12rem,1.75fr)_7rem_3.5rem_minmax(8rem,1fr)]" aria-hidden="true">
            <span className="h-6 border-r border-border" />
            <span className="border-r border-border" />
            <span className="hidden border-r border-border sm:block" />
            <span className="border-r border-border" />
            <span className="hidden border-r border-border sm:block" />
          </div>

          <p className="mt-2 text-right font-display text-[9px] italic text-text-faint">
            Bocka i en art för att registrera en observation. Markeringarna sparas inte.
          </p>
        </section>
      </article>
    </div>
  )
}
