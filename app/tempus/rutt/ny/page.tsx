import type { Metadata } from "next"
import RouteBuilder from "../route-builder"

export const metadata: Metadata = {
  title: "Ny rutt | Tempus",
  description: "Rita en planerad körsträcka och sätt en sökkorridor.",
}

export default function NewRoutePage() {
  return <RouteBuilder />
}
