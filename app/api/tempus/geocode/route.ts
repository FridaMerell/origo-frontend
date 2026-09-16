const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim()
  if (!query || query.length > 160) return Response.json({ results: [] }, { status: 400 })
  const response = await fetch(`${NOMINATIM_URL}?format=jsonv2&limit=5&accept-language=sv&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "Origo-Tempus/1.0 (platskarta)" }, next: { revalidate: 86_400 } })
  if (!response.ok) return Response.json({ results: [] }, { status: 502 })
  const data = await response.json() as { lon: string; lat: string; display_name: string }[]
  return Response.json({ results: data.flatMap((place) => { const lng = Number(place.lon); const lat = Number(place.lat); return Number.isFinite(lng) && Number.isFinite(lat) ? [{ lng, lat, label: place.display_name }] : [] }) }, { headers: { "Cache-Control": "public, max-age=86400" } })
}
