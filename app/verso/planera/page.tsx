import type { Metadata } from "next"
import PlaneraView from "./planera-view"

export const metadata: Metadata = {
  title: "Planering | Verso",
  description: "Planera husets projekt och uppgifter.",
}

export default function PlaneraPage() {
  return <PlaneraView />
}
