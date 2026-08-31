import { NextResponse } from "next/server"
import {
  getTempusObservationItem,
  getTempusSpeciesCategoriesAll,
  getTempusSpeciesItems,
} from "@/app/lib/dal"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const observationId = new URL(request.url).searchParams.get("observation_id")
  const [species, observation, categories] = await Promise.all([
    getTempusSpeciesItems([id]).then((items) => items[0] ?? null),
    observationId ? getTempusObservationItem(observationId) : Promise.resolve(null),
    getTempusSpeciesCategoriesAll(),
  ])

  if (!species) {
    return NextResponse.json(
      { error: "Arten hittades inte." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    )
  }

  const category = categories
    .filter((item) => item.taxon_id && item.species.includes(species.id))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))[0]
  const speciesHref = category?.taxon_id
    ? `/taxa/${category.taxon_id}/${species.dyntaxa_taxon_id}`
    : null

  return NextResponse.json(
    { species, observation, speciesHref },
    { headers: { "Cache-Control": "no-store" } },
  )
}
