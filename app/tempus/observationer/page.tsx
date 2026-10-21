import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTempusChecklistsPage } from "@/app/lib/dal/tempus/checklists"
import { getTempusObservationsPage, getTempusObservedCategoryPage } from "@/app/lib/dal/tempus/observations"
import { getTempusSpeciesItem, getTempusSpeciesItems } from "@/app/lib/dal/tempus/species"
import { LocaleLabel } from "@/app/tempus/locale-label"
import { BiotopeMap } from "@/app/tempus/ui/biotope-map/BiotopeMap"
import { ObservationFilter, ObservationOrder } from "./observation-filter"
import { REGISTER_COLUMNS as COLUMNS, type OBSERVATION_FILTER_PARAMS, type ObservationFilterValues } from "./observation-filter-params"

const OBSERVATIONS_PER_PAGE = 25
// Species picked in one filter; more than this is cut off.
const MAX_FILTER_SPECIES = 20

// Every register cell: its content centred in the row, one text size.
const ROW_CELL = "flex min-w-0 flex-col justify-center gap-0.5 border-r border-border py-2.5 text-sm italic"
const HEAD_CELL = "flex h-8 items-center border-b border-r border-border"
const STEP ="font-display italic text-accent no-underline hover:text-accent-hover"

const speciesName = (s: { swedish_name?: string; scientific_name: string }) =>
  s.swedish_name || s.scientific_name

export const metadata: Metadata = {
  title: "Observationer | Tempus",
  description: "Dina artobservationer.",
}

type SearchParams = Partial<Record<(typeof OBSERVATION_FILTER_PARAMS)[keyof typeof OBSERVATION_FILTER_PARAMS] | "sida", string>>

type PageProps = { searchParams: Promise<SearchParams> }

// "27 sep. 2026": short enough to stay on one line in the time column.
function formatShortDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
}

function readPageNumber(value: string | undefined) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

const isDate = (value: string | undefined): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
const isUuid = (value: string | undefined): value is string =>
  Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))

export default async function ObservationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = readPageNumber(params.sida)
  const taxonIds = [...new Set((params.art ?? "").split(",").filter((part) => /^\d+$/.test(part)))].slice(0, MAX_FILTER_SPECIES)
  const filter = {
    category: isUuid(params.grupp) ? params.grupp : "",
    locale: params.plats && /^\d+$/.test(params.plats) ? params.plats : "",
    checklist: isUuid(params.lista) ? params.lista : "",
    from: isDate(params.fran) ? params.fran : "",
    to: isDate(params.till) ? params.till : "",
    lifeStage: params.stadium?.trim() ?? "",
    photos: params.bilder === "ja" || params.bilder === "nej" ? params.bilder : "",
    order: params.ordning === "aldst" ? "aldst" : "",
  } as const

  const [observations, pickedSpecies, categoryPage, checklistPage] = await Promise.all([
    getTempusObservationsPage({
      species: taxonIds.join(",") || undefined,
      category: filter.category || undefined,
      locale: filter.locale || undefined,
      checklist: filter.checklist || undefined,
      observed_from: filter.from || undefined,
      observed_to: filter.to || undefined,
      life_stage: filter.lifeStage || undefined,
      has_photos: filter.photos ? filter.photos === "ja" : undefined,
      ordering: filter.order ? "observed_at" : "-observed_at",
      page,
      page_size: OBSERVATIONS_PER_PAGE,
    }),
    Promise.all(taxonIds.map((taxonId) => getTempusSpeciesItem(taxonId))),
    getTempusObservedCategoryPage(),
    getTempusChecklistsPage({ page_size: 100 }),
  ])

  const hrefFor = (target: number) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (key !== "sida" && typeof value === "string" && value) next.set(key, value)
    }
    if (target > 1) next.set("sida", String(target))
    const text = next.toString()
    return text ? `/observationer?${text}` : "/observationer"
  }

  // A page past the end (after deleting the last observations on it, or an
  // edited URL) answers 404 from the API; go back to the first page instead.
  if (page > 1 && observations.results.length === 0) redirect(hrefFor(1))

  const species = await getTempusSpeciesItems(observations.results.map((observation) => observation.species))
  const speciesById = new Map(species.map((item) => [item.id, item]))
  const pageSize = observations.pageSize ?? OBSERVATIONS_PER_PAGE
  const pageCount = Math.max(1, Math.ceil(observations.count / pageSize))

  const values: ObservationFilterValues = {
    ...filter,
    species: taxonIds.map((taxonId, index) => {
      const item = pickedSpecies[index]
      return { taxonId: Number(taxonId), label: item ? speciesName(item) : `Dyntaxa ${taxonId}` }
    }),
  }
  const filtered = values.species.length > 0 || Object.values(filter).some(Boolean)

  return (
    <div className="container mx-auto py-5 max-sm:px-3 sm:py-7">
      <article className="rounded-card border border-border bg-surface text-text shadow-card">
        <header className="px-4 pt-3 sm:px-5">
          <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
            <span>Observationsförteckning</span>
            <span>
              {observations.count} {observations.count === 1 ? "post" : "poster"}
              {filtered ? " i urvalet" : ""}
            </span>
          </div>

          <div className={`grid border-b border-border ${COLUMNS}`}>
            <div className="flex min-h-24 flex-col items-center justify-center px-3 py-3 text-center sm:col-span-4 sm:py-4">
              <h1 className="font-display text-2xl font-medium italic tracking-wide sm:text-3xl">Dina observationer</h1>
              <p className="mt-1 font-display text-xs italic leading-5 text-text-muted">Alla fynd du har fört in, med det senaste överst.</p>
              <Link
                href="/observationer/ny"
                className="mt-2 font-display text-xs italic text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent-hover"
              >
                För in en ny observation
              </Link>
            </div>
            <div className="relative min-h-24 overflow-hidden border-t border-border bg-surface-2/25 sm:col-span-3 sm:border-l sm:border-t-0">
              <BiotopeMap
                seed="Dina observationer"
                detail={7}
                relief={6}
                waterStrength={4}
                featureAmount={3}
                compass
                preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 h-full w-full opacity-45"
              />
              <div className="absolute inset-0 bg-linear-to-t from-surface/75 via-transparent to-transparent" />
              <span className="absolute bottom-1.5 left-2 font-display text-[9px] italic text-text-muted">Biotopskiss</span>
            </div>
          </div>
        </header>

        <section className="px-4 pb-4 sm:px-5 sm:pb-5">
          <ObservationFilter
            key={JSON.stringify(params)}
            values={values}
            categories={categoryPage.results.map((row) => ({ id: row.category.id, label: row.category.label, count: row.obs_count }))}
            checklists={checklistPage.results.map((checklist) => ({ id: checklist.id, name: checklist.name }))}
          />

          <div className="flex items-center justify-between border-b border-l border-r border-border font-display text-[9px] italic text-text-muted sm:hidden">
            <span className="px-3 py-1.5">{filtered ? "Urval" : "Senaste fynd"}</span>
            <ObservationOrder order={filter.order} />
          </div>

          <div className={`hidden border-l border-border font-display text-[9px] italic text-text-muted sm:grid ${COLUMNS}`}>
            <span className={`${HEAD_CELL} justify-center px-1`}>Nr</span>
            <span className={`${HEAD_CELL} px-3`}>Artens namn</span>
            <ObservationOrder order={filter.order} className="h-8 border-b border-r border-border" />
            <span className={`${HEAD_CELL} px-3`}>Plats och checklista</span>
            <span className={`${HEAD_CELL} px-3`}>Stadium</span>
            <span className={`${HEAD_CELL} justify-center px-1`}>Bilder</span>
            <span className={`${HEAD_CELL} justify-center px-1`}>Antal</span>
          </div>

          {observations.results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 border-x border-b border-border px-3 py-12 text-center font-display text-sm italic text-text-muted">
              {filtered ? (
                <p>Inga observationer matchar urvalet.</p>
              ) : (
                <>
                  <p>Förteckningen är tom.</p>
                  <Link href="/observationer/ny" className="text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent-hover">
                    För in din första observation
                  </Link>
                </>
              )}
            </div>
          ) : (
            <ol className="border-l border-border">
              {observations.results.map((observation, index) => {
                const match = speciesById.get(observation.species)
                const name = match ? speciesName(match) : observation.species_detail.swedish_name || "Okänd art"
                const observedAt = formatShortDate(observation.observed_at)
                const checklistNames = [...new Set(observation.checklist_names)]
                return (
                  <li key={observation.id}>
                    <Link
                      href={`/observationer/${observation.id}`}
                      aria-label={`Visa observation av ${name}`}
                      className={`grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_3.5rem] border-b border-border font-display text-text no-underline transition-colors hover:bg-accent-wash/20 ${COLUMNS}`}
                    >
                      <span className={`${ROW_CELL} row-span-2 items-center px-1 text-xs text-text-faint sm:row-span-1`}>
                        {(page - 1) * pageSize + index + 1}
                      </span>
                      <span className={`${ROW_CELL} px-3`}>
                        <span className="truncate pr-0.5">{name}</span>
                        {match && match.scientific_name !== name ? (
                          <span className="truncate pr-0.5 text-xs text-text-muted">{match.scientific_name}</span>
                        ) : null}
                        {observation.notes ? (
                          <span className="truncate pr-0.5 text-xs text-text-muted">{observation.notes}</span>
                        ) : null}
                      </span>
                      <span className={`${ROW_CELL} col-start-2 row-start-2 border-t px-3 text-text-muted sm:col-start-auto sm:row-start-auto sm:border-t-0 sm:text-text`}>
                        <span className="truncate pr-0.5">{observedAt ?? "—"}</span>
                      </span>
                      <span className={`${ROW_CELL} hidden px-3 sm:flex`}>
                        {observation.locale ? <span className="truncate pr-0.5"><LocaleLabel localeId={observation.locale} /></span> : null}
                        {checklistNames.length > 0 ? (
                          <span className={`truncate pr-0.5 ${observation.locale ? "text-xs text-text-muted" : ""}`}>{checklistNames.join(", ")}</span>
                        ) : null}
                        {!observation.locale && checklistNames.length === 0 ? <span className="text-text-faint">—</span> : null}
                      </span>
                      <span className={`${ROW_CELL} hidden px-3 sm:flex`}>
                        <span className="truncate pr-0.5">{observation.life_stage || <span className="text-text-faint">—</span>}</span>
                      </span>
                      <span className={`${ROW_CELL} hidden items-center px-1 tabular-nums sm:flex`}>
                        {observation.photos?.length || <span className="text-text-faint">—</span>}
                      </span>
                      <span className={`${ROW_CELL} col-start-3 row-span-2 row-start-1 items-center px-1 tabular-nums sm:col-start-auto sm:row-span-1 sm:row-start-auto`}>
                        {observation.count ?? "—"}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          )}

          {pageCount > 1 ? (
            <nav aria-label="Observationer, sidor" className="mt-3 flex items-center justify-between text-xs">
              {page > 1 ? (
                <Link href={hrefFor(page - 1)} className={STEP}>‹ Föregående</Link>
              ) : (
                <span className="font-display italic text-text-faint">‹ Föregående</span>
              )}
              <span className="font-display italic text-text-muted">Blad {page} av {pageCount}</span>
              {page < pageCount ? (
                <Link href={hrefFor(page + 1)} className={STEP}>Nästa ›</Link>
              ) : (
                <span className="font-display italic text-text-faint">Nästa ›</span>
              )}
            </nav>
          ) : null}
        </section>
      </article>
    </div>
  )
}
