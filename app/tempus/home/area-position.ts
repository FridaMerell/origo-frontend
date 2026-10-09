import type { TempusGeoArea } from "@/app/lib/dal"

const degrees = (value: number, positive: string, negative: string) => {
  const whole = Math.floor(Math.abs(value))
  const minutes = Math.round((Math.abs(value) - whole) * 60)
  // Sixty minutes is the next whole degree.
  const [shownDegrees, shownMinutes] = minutes === 60 ? [whole + 1, 0] : [whole, minutes]
  return `${shownDegrees}°${String(shownMinutes).padStart(2, "0")}′${value < 0 ? negative : positive}`
}

// The centre of the area's bounding box as latitude and longitude, the way a
// map sheet states its position. Null for an area without a shape.
export function areaPosition(geometry: TempusGeoArea["geometry"]): string | null {
  if (!geometry) return null
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [longitude, latitude] of ring) {
        west = Math.min(west, longitude)
        east = Math.max(east, longitude)
        south = Math.min(south, latitude)
        north = Math.max(north, latitude)
      }
    }
  }
  if (!Number.isFinite(west) || !Number.isFinite(south)) return null
  return `${degrees((south + north) / 2, "N", "S")} ${degrees((west + east) / 2, "E", "W")}`
}
