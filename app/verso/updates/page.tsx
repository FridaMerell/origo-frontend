import type { Metadata } from "next"
import UpdatesView from "./updates-view"

export const metadata: Metadata = {
  title: "Uppdateringar | Verso",
  description: "Alla uppdateringar",
}

export default function UpdatesPage() {
  return <UpdatesView />
}
