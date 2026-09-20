import type { Metadata } from "next"
import {
  getDocuments,
  getHistoryEvents,
  getPeople,
  getPersonRelations,
  getPhoto,
  getPhotos,
} from "@/app/lib/dal"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import PersonsView from "./persons-view"

export const metadata: Metadata = {
  title: "Personer | Verso",
  description: "Personer i husets historia - Origo",
}

type SearchParams = Promise<{ person?: string }>

export default async function PersonsPage({ searchParams }: { searchParams: SearchParams }) {
  const { person } = await searchParams
  const house = await resolveSelectedHouse()

  const [people, relations, events, documents] = house
    ? await Promise.all([
        getPeople(house),
        getPersonRelations(house),
        getHistoryEvents(house),
        getDocuments(house),
      ])
    : [[], [], [], []]

  // Photos of the selected person, plus their portrait even if it isn't tagged with them.
  const selected = people.find((p) => String(p.id) === person)
  const photos = house && selected ? await getPhotos(house, { person: selected.id }) : []
  const portrait = selected?.portrait
    ? (photos.find((p) => String(p.id) === String(selected.portrait)) ?? (await getPhoto(selected.portrait)))
    : null

  return (
    <PersonsView
      people={people}
      relations={relations}
      events={events}
      documents={documents}
      photos={photos}
      portrait={portrait}
      selectedId={person}
    />
  )
}
