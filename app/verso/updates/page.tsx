import type { Metadata } from "next"
import UpdatesView from "./updates-view"

export const metadata: Metadata = {
  title: "Uppdateringar | Verso",
  description: "Senaste uppdateringarna om huset.",
}

export default function UpdatesPage() {
  return <UpdatesView />
}
