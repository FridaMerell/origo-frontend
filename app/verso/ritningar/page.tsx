import type { Metadata } from "next"
import { getDrawings } from "@/app/lib/dal"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import DrawingsView from "./drawings-view"

export const metadata: Metadata = {
  title: "Ritningar | Verso",
  description: "Ritningar - Origo",
}

export default async function DrawingsPage() {
  const house = await resolveSelectedHouse()
  const drawings = house ? await getDrawings(house) : []

  return <DrawingsView drawings={drawings} />
}
