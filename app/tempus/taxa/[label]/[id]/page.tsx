import type { Metadata } from "next"
import Link from "next/link"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { TEMPUS_ALL_SWEDEN, TEMPUS_GEO_AREA_COOKIE } from "@/app/lib/config"
import {
  getTempusGeoAreas,
  getTempusSpeciesItem,
  type TempusHabitat,
  getTempusSpeciesCategoryItem,
} from "@/app/lib/dal"
import {
  BiotopeMap,
  SwedenMap,
  type SwedenMapFeature,
} from "@/app/tempus/ui/biotope-map"
import type { SwedenMapPoint } from "@/app/tempus/ui/biotope-map/SwedenMap"
import { biotopePropsFromSpecies } from "@/app/tempus/ui/biotope-map/BiotopeMap"
import { getTempusAllObservationsPage } from "@/app/lib/dal/tempus/observations"
import { formatDateLongOrNull, formatDateNumeric } from "@/app/lib/formatters"
import { formatUserName } from "@/app/lib/format-user-name"
import { ChevronLeft, ChevronRight } from "lucide-react"
import CompareButton from "./CompareButton"
import FollowButton from "./FollowButton"
import PhenogramPanel from "./PhenogramPanel"
import SpeciesPhotos from "./SpeciesPhotos"
import ExpandableText from "./expandable-text"
import ModeSheet from "./mode-sheet"

const speciesName = (s: { swedish_name?: string; scientific_name: string }) =>
  s.swedish_name || s.scientific_name

// "stor" (strong association) before "har" (present); unknown grades last.
const SIGNIFICANCE_RANK: Record<string, number> = { stor: 0, har: 1 }
const bySignificance = (a: TempusHabitat, b: TempusHabitat) =>
  (SIGNIFICANCE_RANK[a.significance] ?? 9) - (SIGNIFICANCE_RANK[b.significance] ?? 9) ||
  a.name.localeCompare(b.name, "sv")

const HabitatList = ({ items, preview = false }: { items: TempusHabitat[]; preview?: boolean }) => {
  const names = [...items].sort(bySignificance).map(({ name }) =>
    name === name.toLocaleUpperCase("sv") ? name.charAt(0) + name.slice(1).toLocaleLowerCase("sv") : name,
  )
  if (preview && names.length > 8) return (
    <div className="text-sm leading-6">
      <ExpandableText
        head={names.slice(0, 8).join(", ")}
        rest={names.slice(8).join(", ")}
        moreLabel={`Visa alla ${names.length} biotoper`}
        lessLabel="Visa färre biotoper"
      />
    </div>
  )
  return <p className="text-sm leading-6">{names.join(", ")}</p>
}

const Head = ({ title }: { title: string }) => (
  <h2 className="border-b border-border pb-2 text-base font-medium">{title}</h2>
)

const term = "text-xs text-text-muted"

export async function generateMetadata({ params }: { params: Promise<{ label: string; id: string }> }): Promise<Metadata> {
  const { id } = await params
  const species = await getTempusSpeciesItem(id)
  if (!species) return { title: "Art | Tempus", description: "En art i Tempus." }
  const name = speciesName(species)
  const scientific = species.swedish_name && species.scientific_name !== species.swedish_name
    ? ` (${species.scientific_name})`
    : ""
  return {
    title: `${name} | Arter`,
    description: `${name}${scientific}: när arten är aktiv under året, var den förekommer, livsmiljö och dina observationer.`,
  }
}

const Page = async ({ params, searchParams }: {
  params: Promise<{ label: string; id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) => {
  const { label: rawLabel, id } = await params
  const { p } = await searchParams
  const observationPage = typeof p === "string" && parseInt(p) > 0 ? parseInt(p) : 1
  const routeLabel = decodeURIComponent(rawLabel)
  const fromHomeOverview = routeLabel === "foljda" || routeLabel === "oversikt"
  const [geoAreas, cookieStore] = await Promise.all([getTempusGeoAreas(), cookies()])
  const selectedId = cookieStore.get(TEMPUS_GEO_AREA_COOKIE)?.value
  const selectedGeoArea = selectedId === TEMPUS_ALL_SWEDEN
    ? null
    : geoAreas.find((geoArea) => geoArea.id === selectedId) ?? geoAreas[0] ?? null

  const [species, category, observations, photoObservations] = await Promise.all([
    getTempusSpeciesItem(id),
    fromHomeOverview ? Promise.resolve(null) : getTempusSpeciesCategoryItem(routeLabel),
    // `id` is the Dyntaxa taxon id, which the observation filter accepts.
    getTempusAllObservationsPage({ species: id, page: observationPage, page_size: 10 }),
    getTempusAllObservationsPage({ species: id, has_photos: "true", page_size: 12 }),
  ])
  if (!species) notFound()

  const observationPages = Math.max(1, Math.ceil(observations.count / (observations.pageSize ?? 10)))
  const observationHref = (targetPage: number) =>
    `${targetPage > 1 ? `?p=${targetPage}` : "?"}#observationer`

  const selectedMapAreas: SwedenMapFeature[] = selectedGeoArea?.geometry
    ? [{
      type: "Feature",
      id: selectedGeoArea.id,
      properties: { name: selectedGeoArea.name },
      geometry: selectedGeoArea.geometry,
    }]
    : []
  const observationPoints: SwedenMapPoint[] = observations.results.flatMap((observation) =>
    observation.location.type === "Point"
      ? [{ id: observation.id, coordinates: observation.location.coordinates }]
      : [],
  )

  const name = speciesName(species)
  const showsScientific = Boolean(species.swedish_name) && species.scientific_name !== species.swedish_name
  const facts: Array<[string, string]> = [
    ["Rang", species.taxon_rank],
    ["Dyntaxa taxon-ID", String(species.dyntaxa_taxon_id)],
    ["Status", species.is_active ? "Aktiv" : "Inaktiv"],
    ["Senast synkad", species.synced_at ? formatDateNumeric(species.synced_at) : "Aldrig"],
  ]

  const map = (
    <BiotopeMap
      {...biotopePropsFromSpecies(species)}
      theme={{ contourMinor: "var(--text-muted)", contourMajor: "var(--accent)", inkSoft: "var(--text-muted)" }}
      height={500}
      compass={false}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    />
  )

  const factSheet = (
    <dl className="flex h-full flex-col border-t border-border">
        {facts.map(([label, text]) => (
          <div key={label} className="grid flex-1 grid-cols-[7rem_minmax(0,1fr)] items-center gap-2 border-b border-border py-2.5">
            <dt className={term}>{label}</dt>
            <dd className="break-words text-sm">{text}</dd>
          </div>
        ))}
        <div className="grid flex-1 grid-cols-[7rem_minmax(0,1fr)] items-center gap-2 border-b border-border py-2.5">
          <dt className={term}>Kategorier</dt>
          <dd className="break-words text-sm">
            {species.categories.length === 0 ? "—" : species.categories.map((speciesCategory, index) => (
              <span key={speciesCategory.taxon_id ?? speciesCategory.label}>
                {index > 0 ? ", " : null}
                {speciesCategory.taxon_id ? (
                  <Link href={`/taxa/${speciesCategory.taxon_id}`}>{speciesCategory.label}</Link>
                ) : speciesCategory.label}
              </span>
            ))}
          </dd>
        </div>
    </dl>
  )

  const basic = (
    <>

      <section className="flex flex-col gap-3">
        <Head title="Aktivitet & utbredning" />
        <div className="grid border-b border-border md:grid-cols-3">
          <div className="flex min-w-0 flex-col py-4 md:col-span-2 md:pr-5">
            <PhenogramPanel
              id={id}
              geoAreaId={selectedGeoArea?.id}
              areaName={selectedGeoArea?.name ?? "hela Sverige"}
              sheet
            />
          </div>
          <div className="flex flex-col border-t border-border px-0 py-4 md:border-l md:border-t-0 md:pl-4">
            <p className="border-b border-border pb-2 text-xs italic text-text-muted">{selectedGeoArea?.name ?? "Hela Sverige"}</p>
            <div className="flex flex-1 items-center justify-center">
              <div className="w-48 lg:w-56 xl:w-64">
                <SwedenMap
                  areas={selectedMapAreas}
                  points={observationPoints}
                  title={selectedGeoArea ? `${selectedGeoArea.name} markerat på Sverigekartan` : "Sverigekarta"}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="border-b border-border py-4">
          <h3 className="mb-2 text-sm font-medium">Livsmiljö</h3>
          {species.landscape_types?.length > 0 && (
            <div className="grid gap-x-4 border-t border-border py-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
              <h4 className={`${term} not-italic`}>Landskapstyper</h4>
              <HabitatList items={species.landscape_types} />
            </div>
          )}
          {species.biotopes?.length > 0 && (
            <div className="grid gap-x-4 border-t border-border py-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
              <h4 className={`${term} not-italic`}>Biotoper</h4>
              <HabitatList items={species.biotopes} preview />
            </div>
          )}
        </div>
      </section>

      {photoObservations.results.length > 0 && (
        <section className="flex flex-col gap-3">
          <Head title="Bilder" />
          <SpeciesPhotos
            observations={photoObservations.results}
            name={name}
            scientificName={showsScientific ? species.scientific_name : undefined}
            sheet
          />
        </section>
      )}

      <section id="observationer" className="flex flex-col gap-4">
        <Head title="Observationer" />
        {observations.results.length === 0 ? (
          <p className="py-2 text-sm italic text-text-muted">Ingen har observerat {name} än.</p>
        ) : (
          <div className="border-l border-t border-border">
            <div className={`grid grid-cols-[minmax(0,1fr)_4rem] gap-x-4 border-b border-r border-border px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_4rem] ${term}`}>
              <span>Datum</span>
              <span className="max-sm:hidden">Person</span>
              <span className="max-sm:hidden">Livsstadium</span>
              <span className="text-right">Antal</span>
            </div>
            <ul>
              {observations.results.map((observation) => (
                <li key={observation.id} className="border-b border-r border-border">
                  <Link
                    href={`/observationer/${observation.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_4rem] items-baseline gap-x-4 gap-y-0.5 px-3 py-2.5 text-sm italic text-text no-underline transition-colors hover:bg-surface-2/40 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_4rem]"
                  >
                    <span className="min-w-0 truncate">{formatDateLongOrNull(observation.observed_at) ?? "—"}</span>
                    <span className="min-w-0 truncate max-sm:hidden">{formatUserName(observation)}</span>
                    <span className="min-w-0 truncate max-sm:hidden">{observation.life_stage || "—"}</span>
                    <span className="col-span-2 row-start-2 min-w-0 truncate text-text-muted sm:hidden">
                      {formatUserName(observation)}
                      {observation.life_stage ? ` · ${observation.life_stage}` : null}
                    </span>
                    <span className="col-start-2 row-start-1 text-right tabular-nums sm:col-start-auto sm:row-start-auto">
                      {observation.count ?? "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(observations.next || observations.previous) && (
          <nav data-pager="" className="flex items-center justify-between text-xs italic" aria-label="Sidnavigering för observationer">
            {observations.previous ? (
              <Link data-page-step="previous" href={observationHref(observationPage - 1)} className="inline-flex items-center gap-1 text-text-muted hover:text-text">
                <ChevronLeft size={14} />
                Föregående
              </Link>
            ) : <span />}
            <span className="text-text-muted">Sida {observationPage} av {observationPages}</span>
            {observations.next ? (
              <Link data-page-step="next" href={observationHref(observationPage + 1)} className="inline-flex items-center gap-1 text-text-muted hover:text-text">
                Nästa
                <ChevronRight size={14} />
              </Link>
            ) : <span />}
          </nav>
        )}
      </section>
    </>
  )

  return (
    <div className="container mx-auto py-5 max-sm:px-3 sm:py-7">
      <div className="mb-3 flex items-center justify-between gap-4 text-xs italic text-text-muted">
        <Link
          href={routeLabel === "oversikt" ? "/?view=all" : fromHomeOverview ? "/" : `/taxa/${encodeURIComponent(routeLabel)}`}
          className="no-underline hover:text-accent"
        >
          ← {routeLabel === "oversikt" ? "Alla arter" : fromHomeOverview ? "Säsongsöversikt" : category?.label ?? "Okänd kategori"}
        </Link>
        <span>Dyntaxa {species.dyntaxa_taxon_id}</span>
      </div>
      <ModeSheet
        taxonId={id}
        name={name}
        scientificName={showsScientific ? species.scientific_name : undefined}
        artfaktaHref={`https://artfakta.se/taxa/${species.dyntaxa_taxon_id}/information`}
        facts={factSheet}
        map={map}
        updated={species.synced_at ? formatDateNumeric(species.synced_at) : "aldrig"}
        follow={
          <>
          <CompareButton id={id} name={name} scientificName={showsScientific ? species.scientific_name : undefined} />
          <FollowButton
            taxa={String(species.dyntaxa_taxon_id)}
            initial={species.is_followed}
            initialNotify={species.is_notify ?? false}
            props={{ className: "!h-6 !px-1.5 !text-[11px]" }}
          />
          </>
        }
        basic={basic}
      />
    </div>
  )
}

export default Page
