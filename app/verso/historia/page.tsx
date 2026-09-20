import type { Metadata } from "next"
import { getAlbums, getDocuments, getHistoryEvents, getOnThisDay, getPeople, getPhotos, getPhotoTags, type Photo } from "@/app/lib/dal"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import HistoryView from "./history-view"

export const metadata: Metadata = {
  title: "Historia | Verso",
  description: "Historiska dokument - Origo",
}

type SearchParams = Promise<{ album?: string }>

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  const { album } = await searchParams
  const house = await resolveSelectedHouse()

  const [albums, tags, people, events, onThisDay, documents] = house
    ? await Promise.all([
        getAlbums(house),
        getPhotoTags(house),
        getPeople(house),
        getHistoryEvents(house),
        getOnThisDay(house),
        getDocuments(house),
      ])
    : [[], [], [], [], null, []]
  const historyAlbums = albums.filter((a) => a.kind === "history")

  // History is the photos that sit in a history album; one album when filtered.
  const shown = historyAlbums.filter((a) => !album || a.id === album)
  const perAlbum = house ? await Promise.all(shown.map((a) => getPhotos(house, { album: a.id }))) : []
  const photos = [...new Map(perAlbum.flat().map((p: Photo) => [p.id, p])).values()]

  return (
    <HistoryView
      photos={photos}
      events={events}
      albums={albums}
      historyAlbums={historyAlbums}
      tags={tags}
      people={people}
      onThisDay={onThisDay}
      documents={documents}
      activeAlbum={album}
    />
  )
}
