import type { Metadata } from "next"
import Home from "./NewHome"
import { species as speciesCards } from "./species-data"
import { getTempusSpecies, getTempusSpeciesPhenogram } from "@/app/lib/dal"
import { getFollowedSpecies } from "../actions/tempus"

export const metadata: Metadata = {
  title: "Tempus | Origo",
  description: "Säsongsöversikt och ruttplanering.",
}


export default async function TempusPage() {
  const followedSpecies = await getFollowedSpecies()
  return <Home followedSpecies={followedSpecies} />
}
