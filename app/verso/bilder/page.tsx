import type { Metadata } from "next"
import { getAlbums, getPhotos, getPhotoTags, type PhotoStage } from "@/app/lib/dal"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import PhotosView from "./photos-view"

export const metadata: Metadata = {
  title: "Bilder | Verso",
  description: "Bildbank - Origo",
}

const STAGES: PhotoStage[] = ["before", "during", "after"]

type SearchParams = Promise<{ album?: string; tag?: string; stage?: string }>

export default async function PhotosPage({ searchParams }: { searchParams: SearchParams }) {
  const { album, tag, stage } = await searchParams
  const house = await resolveSelectedHouse()

  const activeStage = STAGES.find((s) => s === stage)
  const [photos, albums, tags] = house
    ? await Promise.all([
        getPhotos(house, { album, tag, stage: activeStage }),
        getAlbums(house),
        getPhotoTags(house),
      ])
    : [[], [], []]

  return (
    <PhotosView
      photos={photos}
      albums={albums}
      tags={tags}
      active={{ album, tag, stage: activeStage }}
    />
  )
}
