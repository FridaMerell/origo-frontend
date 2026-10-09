import { NextResponse, type NextRequest } from "next/server"
import { getTempusSeasonalOverviewPage } from "@/app/lib/dal/tempus/species"

export const dynamic = "force-dynamic"

const PARAMS = ["geo_area", "min_records", "status", "landscape_type", "is_followed", "page", "page_size"]

// The seasonal overview for the start page's own reloads. The API serves it
// without a session, so this does too.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams
  const query = Object.fromEntries(PARAMS.flatMap((name) => (search.has(name) ? [[name, search.get(name)]] : [])))
  const page = await getTempusSeasonalOverviewPage(query, { shared: search.get("shared") === "1" })
  return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } })
}
