import type { GeoGeometry, GeoPosition } from "@/app/lib/land-cover"

export type { GeoGeometry, GeoPosition }

// ---------------------------------------------------------------------------
// Web Mercator projection helpers, shared by both the SVG map (GeoMapCanvas)
// and the canvas-based map (geo-map-canvas/GeoMapCanvas). Kept in one place
// so the two renderers can never drift apart on how a lng/lat maps to a
// pixel — only how that pixel gets painted differs between them.
// ---------------------------------------------------------------------------

export const GEO_MAP_WIDTH = 1000
export const GEO_MAP_HEIGHT = 700
export const TILE_SIZE = 256
export const MIN_ZOOM = 1
export const MAX_ZOOM = 18

export type GeoMapInitialView = { center: readonly [number, number]; zoom: number }

export function worldPoint([lng, lat]: GeoPosition, zoom: number): readonly [number, number] {
  const scale = TILE_SIZE * 2 ** zoom
  const limitedLatitude = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const sinLatitude = Math.sin((limitedLatitude * Math.PI) / 180)
  return [((lng + 180) / 360) * scale, (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale]
}

export function positionFromWorld(x: number, y: number, zoom: number): GeoPosition {
  const scale = TILE_SIZE * 2 ** zoom
  return [(x / scale) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI]
}

export function rings(geometry: GeoGeometry): readonly (readonly GeoPosition[])[] {
  return geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat()
}

export function geometryBounds(geometry: GeoGeometry): readonly [number, number, number, number] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  for (const ring of rings(geometry)) {
    for (const [lng, lat] of ring) {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    }
  }
  return [minLng, minLat, maxLng, maxLat]
}

export function fitGeometryView(geometry: GeoGeometry, width = GEO_MAP_WIDTH, height = GEO_MAP_HEIGHT): GeoMapInitialView {
  const [minLng, minLat, maxLng, maxLat] = geometryBounds(geometry)
  const center: readonly [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
  let zoom = MAX_ZOOM
  for (; zoom > MIN_ZOOM; zoom--) {
    const [x0, y0] = worldPoint([minLng, maxLat], zoom)
    const [x1, y1] = worldPoint([maxLng, minLat], zoom)
    if (x1 - x0 <= width && y1 - y0 <= height) break
  }
  return { center, zoom }
}

export function geometryPath(geometry: GeoGeometry, project: (point: GeoPosition) => readonly [number, number]) {
  return rings(geometry).map((ring) => ring.map((point, index) => {
    const [x, y] = project(point)
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`
  }).join("") + "Z").join("")
}
