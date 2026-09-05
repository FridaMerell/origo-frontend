import { NextResponse } from "next/server"

// The fields WeatherWidget (app/verso/home-view.tsx) actually reads off each
// timeSeries entry. Everything else in the SMHI payload is dropped.
const WEATHER_FIELDS = [
  "symbol_code",
  "air_temperature",
  "wind_speed",
  "wind_from_direction",
  "relative_humidity",
  "air_pressure_at_mean_sea_level",
  "precipitation_amount_mean",
  "visibility_in_air",
  "cloud_area_fraction",
] as const

type SmhiEntry = { time: string; data: Record<string, number> }

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get("lat"))
  const lng = Number(searchParams.get("lng"))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat och lng krävs" }, { status: 400 })
  }

  // Round to 3 decimals so nearby facilities share one Data Cache entry.
  const url =
    `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1` +
    `/geotype/point/lon/${lng.toFixed(3)}/lat/${lat.toFixed(3)}/data.json`

  const response = await fetch(url, { next: { revalidate: 1800 } })
  if (!response.ok) {
    return NextResponse.json(
      { error: "Väderdata är inte tillgänglig just nu." },
      { status: 502 },
    )
  }

  const raw = (await response.json()) as { timeSeries?: SmhiEntry[] }
  const timeSeries = (raw.timeSeries ?? []).map((entry) => {
    const data: Record<string, number> = {}
    for (const field of WEATHER_FIELDS) {
      if (entry.data?.[field] != null) data[field] = entry.data[field]
    }
    return { time: entry.time, data }
  })

  return NextResponse.json({ timeSeries })
}
