import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Icon } from "@/app/components/ui/Icon"
import { getTempusObservationItem, getTempusSpecies } from "@/app/lib/dal"
import { BiotopeMap, biotopePropsFromSpecies } from "@/app/tempus/ui/biotope-map/BiotopeMap"
import ObservationEditor from "./observation-editor"

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const observation = await getTempusObservationItem(id)
  if (!observation) return { title: "Observation | Tempus" }
  const species = (await getTempusSpecies()).find((item) => item.id === observation.species)
  const name = species?.swedish_name || species?.scientific_name
  return { title: name ? `${name} | Observationer` : "Observation | Tempus" }
}

function formatDateTime(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString("sv-SE", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
}

export default async function ObservationDetailPage({ params }: PageProps) {
  const { id } = await params
  const observation = await getTempusObservationItem(id)
  if (!observation) notFound()

  const species = (await getTempusSpecies()).find((item) => item.id === observation.species)
  const speciesLabel = species?.swedish_name || species?.scientific_name || "Okänd art"
  const observedAt = formatDateTime(observation.observed_at)
  const point =
    observation.location && "coordinates" in observation.location
      ? observation.location.coordinates
      : null
  const [lon, lat] = point ?? [null, null]
  const hasCoords = typeof lat === "number" && typeof lon === "number"

  return (
    <div className="container mx-auto max-w-4xl py-5 max-sm:px-3 sm:py-7">
      <Link
        href="/observationer"
        className="mb-3 flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent"
      >
        <Icon name="chevron-left" size={13} />
        Observationer
      </Link>

      <article className="overflow-hidden rounded-card border border-border bg-surface text-text shadow-card">
        <header className="px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
          <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
            <span>Observationsförteckning</span>
            <span>Post {observation.id.slice(0, 6).toUpperCase()}</span>
          </div>

          <div className="grid border-b border-border sm:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="flex min-h-24 flex-col items-center justify-center px-3 py-3 text-center sm:py-4">
              <h1 className="font-display text-2xl font-medium italic tracking-wide sm:text-3xl">
                {speciesLabel}
              </h1>
              {species?.scientific_name && species.swedish_name ? (
                <p className="mt-1 font-display text-xs italic text-text-muted">
                  {species.scientific_name}
                  <span className="ml-2 font-mono text-[9px] not-italic text-text-faint">
                    Dyntaxa {species.dyntaxa_taxon_id}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="relative min-h-24 overflow-hidden border-t border-border bg-surface-2/25 sm:border-l sm:border-t-0">
              <BiotopeMap
                {...(species ? biotopePropsFromSpecies(species) : { seed: speciesLabel })}
                detail={7}
                relief={6}
                waterStrength={4}
                featureAmount={3}
                compass
                preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 h-full w-full opacity-45"
                style={{ width: "100%", height: "100%" }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-surface/75 via-transparent to-transparent" />
              <span className="absolute bottom-1.5 left-2 font-display text-[9px] italic text-text-muted">
                Biotopskiss{species?.scientific_name ? ` · ${species.scientific_name}` : ""}
              </span>
            </div>
          </div>
        </header>

        <section className="px-3 pb-3 sm:px-5 sm:pb-5">
          <dl className="grid border-l border-t border-border font-display sm:grid-cols-[1.4fr_.55fr_1.15fr_.7fr]">
            <div className="border-b border-r border-border px-3 py-2">
              <dt className="text-[9px] italic text-text-faint">Tidpunkt</dt>
              <dd className="mt-0.5 text-xs italic">{observedAt ?? "—"}</dd>
            </div>
            <div className="border-b border-r border-border px-3 py-2">
              <dt className="text-[9px] italic text-text-faint">Antal</dt>
              <dd className="mt-0.5 text-xs italic">{observation.count ?? "—"}</dd>
            </div>
            <div className="border-b border-r border-border px-3 py-2">
              <dt className="text-[9px] italic text-text-faint">Position</dt>
              <dd className="mt-0.5 truncate text-xs italic">
                {hasCoords ? (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:text-accent-hover"
                  >
                    {(lat as number).toFixed(5)}, {(lon as number).toFixed(5)}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="border-b border-r border-border px-3 py-2">
              <dt className="text-[9px] italic text-text-faint">Checklistrader</dt>
              <dd className="mt-0.5 text-xs italic">{observation.checklist_items.length || "—"}</dd>
            </div>
          </dl>

          <div className="min-h-20 border-x border-b border-border px-3 py-2 font-display">
            <p className="text-[9px] italic text-text-faint">Särskild anteckning</p>
            <p className="mt-1 whitespace-pre-wrap text-sm italic leading-6 text-text-muted">
              {observation.notes || "—"}
            </p>
          </div>
        </section>
      </article>

      <div className="mt-3">
        <ObservationEditor observation={observation} />
      </div>
    </div>
  )
}
