import { NextResponse, type NextRequest } from "next/server"
import { getTempusSeasonalLandscapes } from "@/app/lib/dal/tempus/species"

export const dynamic = "force-dynamic"

const PARAMS = ["geo_area", "min_records", "limit"]

// The seasonal overview grouped by landscape type, for the start page's own reloads.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams
  const query = Object.fromEntries(PARAMS.flatMap((name) => (search.has(name) ? [[name, search.get(name)]] : [])))
  return NextResponse.json(await getTempusSeasonalLandscapes(query), { headers: { "Cache-Control": "no-store" } })
}
