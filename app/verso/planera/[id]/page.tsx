import type { Metadata } from "next"
import { getAlbums, getPhotos, getPhotoTags, getVenture, getVentureDrawings } from "@/app/lib/dal"
import VentureView from "./venture-view"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const venture = await getVenture(id)

  return {
    title: venture ? `${venture.name} | Planering` : "Projekt | Planering",
    description: venture ? venture.description || venture.name : "Projekt i Verso",
  }
}

export default async function VenturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const venture = await getVenture(id)
  const [drawings, photos, albums, tags] = await Promise.all([
    getVentureDrawings(id),
    venture ? getPhotos(venture.house, { venture: id }) : [],
    venture ? getAlbums(venture.house) : [],
    venture ? getPhotoTags(venture.house) : [],
  ])

  return <VentureView drawings={drawings} photos={photos} albums={albums} tags={tags} />
}
