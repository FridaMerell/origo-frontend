import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTempusRouteItem, getTempusRouteStops } from "@/app/lib/dal"
import RouteDetail from "../route-detail"

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const route = await getTempusRouteItem(id)
  return { title: route ? `${route.name} | Rutter` : "Rutt" }
}

export default async function RouteDetailPage({ params }: PageProps) {
  const { id } = await params
  const route = await getTempusRouteItem(id)
  if (!route) notFound()

  const stops = await getTempusRouteStops(id)

  return <RouteDetail route={route} stops={stops} />
}
