import type { Metadata } from "next"
import PlaneraView from "./planera-view"

export const metadata: Metadata = {
  title: "Planering | Verso",
  description: "Planering - Origo",
}

export default function PlaneraPage() {
  return <PlaneraView />
}
