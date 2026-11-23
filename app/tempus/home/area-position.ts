import type { TempusGeoArea } from "@/app/lib/dal"
import { formatPosition } from "@/app/lib/geo"

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
  return formatPosition([(west + east) / 2, (south + north) / 2])
}
