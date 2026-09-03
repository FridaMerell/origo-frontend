import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  getTempusObservationItem,
  getTempusSpeciesCategoriesAll,
  getTempusSpeciesItems,
} from "@/app/lib/dal"
import ObservationEditor from "./observation-editor"
import ObservationWidget from "../observation-widget"

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const observation = await getTempusObservationItem(id)
  if (!observation) return { title: "Observation | Tempus" }
  const species = (await getTempusSpeciesItems([observation.species]))[0] ?? null
  const name = species?.swedish_name || species?.scientific_name
  return { title: name ? `${name} | Observationer` : "Observation | Tempus" }
}

export default async function ObservationDetailPage({ params }: PageProps) {
  const { id } = await params
  const observation = await getTempusObservationItem(id)
  if (!observation) notFound()

  const [species, categories] = await Promise.all([
    getTempusSpeciesItems([observation.species]).then((items) => items[0] ?? null),
    getTempusSpeciesCategoriesAll(),
  ])
  const category = species
    ? categories
        .filter((item) => item.taxon_id && item.species?.includes(species.id))
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))[0]
    : null
  const speciesHref = species && category?.taxon_id
    ? `/taxa/${category.taxon_id}/${species.dyntaxa_taxon_id}`
    : null
  const checklistNames = [...new Set(observation.checklist_names)]

  return (
    <div className="container mx-auto max-w-4xl py-5 max-sm:px-3 sm:py-7">
      <Link
        href="/observationer"
        className="mb-3 flex w-fit font-mono text-[10px] uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent"
      >
        ← Till observationer
      </Link>

      <ObservationWidget
        observation={observation}
        species={species}
        speciesHref={speciesHref}
        checklistNames={checklistNames}
      />

      <div className="mt-3">
        <ObservationEditor observation={observation} />
      </div>
    </div>
  )
}
