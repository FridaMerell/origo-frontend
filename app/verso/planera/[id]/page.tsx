import type { Metadata } from "next"
import { getVenture } from "@/app/lib/dal"
import VentureView from "./venture-view"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const venture = await getVenture(id)

  return {
    title: venture ? `${venture.name} | Planering` : "Projekt | Planering",
    description: venture ? venture.description || venture.name : "Projekt i Verso",
  }
}

export default function VenturePage() {
  return <VentureView />
}
