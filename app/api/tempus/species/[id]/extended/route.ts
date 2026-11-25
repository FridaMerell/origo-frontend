import { NextResponse, type NextRequest } from "next/server"
import { getTempusSpeciesArtfakta, getTempusSpeciesSounds } from "@/app/lib/dal/tempus/species"

export const dynamic = "force-dynamic"

// The recordings (`part=sounds`) or the Artfakta texts (`part=artfakta`) of one species, `id` being its
// Dyntaxa taxon id (unlike the sibling route, where it is the species' own id). They are fetched apart, as
// plain requests, so a page can ask for both at once and show each as soon as it is there.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const part = request.nextUrl.searchParams.get("part")
  if (!/^\d+$/.test(id) || (part !== "sounds" && part !== "artfakta")) {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }

  const load = part === "sounds" ? getTempusSpeciesSounds : getTempusSpeciesArtfakta
  const failed = (result: Awaited<ReturnType<typeof load>>) =>
    !result || Boolean(part === "sounds" ? result.sounds_error : result.artfakta_error)
  // One more try when the source failed: such a failure is most often over the next moment.
  const first = await load(id)
  const result = failed(first) ? ((await load(id, 1)) ?? first) : first

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
}
