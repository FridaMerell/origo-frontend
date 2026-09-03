import Link from "next/link"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { Card } from "@/app/components/ui/Card"
import { Chip } from "@/app/components/ui/Chip"
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
import { biotopePropsFromSpecies } from "@/app/tempus/ui/biotope-map/BiotopeMap"
import FollowButton from "./FollowButton"
import PhenogramPanel from "./PhenogramPanel"

const speciesName = (s: { swedish_name?: string; scientific_name: string }) =>
  s.swedish_name || s.scientific_name

// "stor" (strong association) before "har" (present); unknown grades last.
const SIGNIFICANCE_RANK: Record<string, number> = { stor: 0, har: 1 }
const bySignificance = (a: TempusHabitat, b: TempusHabitat) =>
  (SIGNIFICANCE_RANK[a.significance] ?? 9) - (SIGNIFICANCE_RANK[b.significance] ?? 9) ||
  a.name.localeCompare(b.name, "sv")

const HabitatChips = ({ items }: { items: TempusHabitat[] }) => (
  <div className="flex flex-wrap gap-2">
    {[...items].sort(bySignificance).map((habitat) => (
      <Chip
        key={habitat.id}
        title={`Betydelse: ${habitat.significance}`}
        variant={habitat.significance === "stor" ? "neutral-active" : "neutral"}
      >
        {habitat.name}
      </Chip>
    ))}
  </div>
)

const Page = async ({ params }: { params: Promise<{ label: string; id: string }> }) => {
  const { label: rawLabel, id } = await params
  const label = decodeURIComponent(rawLabel)
  const fromHomeOverview = label === "foljda" || label === "oversikt"
  const [geoAreas, cookieStore] = await Promise.all([
    getTempusGeoAreas(),
    cookies(),
  ])
  const selectedId = cookieStore.get(TEMPUS_GEO_AREA_COOKIE)?.value
  const selectedGeoArea = selectedId === TEMPUS_ALL_SWEDEN
    ? null
    : geoAreas.find((geoArea) => geoArea.id === selectedId) ?? geoAreas[0] ?? null

  const [species, category] = await Promise.all([
    getTempusSpeciesItem(id),
    fromHomeOverview ? Promise.resolve(null) : getTempusSpeciesCategoryItem(label),
  ])
  if (!species) notFound()

  const selectedMapAreas: SwedenMapFeature[] = selectedGeoArea?.geometry
    ? [
      {
        type: "Feature",
        id: selectedGeoArea.id,
        properties: { name: selectedGeoArea.name },
        geometry: selectedGeoArea.geometry,
      },
    ]
    : []

  const facts: Array<[string, string]> = [
    ["Vetenskapligt namn", species.scientific_name],
    ["Svenskt namn", species.swedish_name || "—"],
    ["Taxonomisk rang", species.taxon_rank],
    ["Dyntaxa taxon-ID", String(species.dyntaxa_taxon_id)],
    ["Status", species.is_active ? "Aktiv" : "Inaktiv"],
    [
      "Senast synkad",
      species.synced_at ? new Date(species.synced_at).toLocaleDateString("sv-SE") : "Aldrig",
    ],
  ]


  return (
    <div className="container py-5 mx-auto flex flex-col gap-5">
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex flex-col gap-1">
          <Link
            href={label === "oversikt" ? "/?view=all" : fromHomeOverview ? "/" : `/taxa/${encodeURIComponent(label)}`}
            className="w-fit font-mono text-xs uppercase tracking-wide text-text-muted hover:text-text"
          >
            ← {label === "oversikt" ? "Alla arter" : fromHomeOverview ? "Säsongsöversikt" : category?.label ?? "Okänd kategori"}
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:mt-3 capitalize">
            {speciesName(species)}
          </h1>
          {species.swedish_name && species.scientific_name !== species.swedish_name && (
            <em className="font-mono text-sm text-text-muted">{species.scientific_name}</em>
          )}
          <a
            href={`https://artfakta.se/taxa/${species.dyntaxa_taxon_id}/information`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 w-fit font-display text-sm italic text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent-hover"
          >
            Visa artfakta
          </a>
        </div>
        <div className="flex items-center justify-end">
          <FollowButton taxa={String(species.dyntaxa_taxon_id)} initial={species.is_followed} />
        </div>
      </div>
      <Card className="relative overflow-hidden shadow-sm min-h-70">

        <BiotopeMap
          {...biotopePropsFromSpecies(species)}
          compass={true}
          aria-hidden="true"
          preserveAspectRatio="xMaxYMax slice"
          className="absolute inset-0 z-0 opacity-30"
          style={{ width: "100%", height: "100%" }}
        />

        <div className="absolute inset-0 bg-linear-to-r from-surface via-surface/12 to-transparent" />
        <dl className="relative z-10 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 w-max">
          {facts.map(([term, value]) => (
            <div key={term} className="flex flex-col gap-0.5">
              <dt className="font-mono text-[10px] uppercase tracking-wide text-text-faint">{term}</dt>
              <dd className="text-sm text-text">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-wide text-text-faint">Aktivitet</h2>
        <Card className="flex flex-col md:flex-row gap-3 items-end">
          <div className="md:w-2/3 flex-col flex justify-space gap-10">
            <PhenogramPanel
              id={id}
              geoAreaId={selectedGeoArea?.id}
              areaName={selectedGeoArea?.name ?? "hela Sverige"}
            />
            <hr className="my-3 border-text-muted" />
            <section className="flex flex-col gap-3">
              <h2 className="font-mono text-[10px] uppercase tracking-wide text-text-faint">Livsmiljö</h2>
              {species.landscape_types?.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-faint">
                    Landskapstyper
                  </h3>
                  <HabitatChips items={species.landscape_types} />
                </div>
              )}
              {species.biotopes?.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wide text-text-faint">
                    Biotoper
                  </h3>
                  <HabitatChips items={species.biotopes.length >6 ? species.biotopes.slice(0, 6) : species.biotopes} />
                </div>
              )}
            </section>
          </div>

          <SwedenMap
            className="md:w-1/3"
            areas={selectedMapAreas}
            title={selectedGeoArea ? `${selectedGeoArea.name} markerat på Sverigekartan` : "Sverigekarta"}
          />
        </Card>

      </section >

    </div >
  )
}

export default Page
