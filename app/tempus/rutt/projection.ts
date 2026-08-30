// Shared map projection for the route planner. Mirrors the equirectangular
// projection baked into SwedenMap so an overlay <svg> lines up pixel-for-pixel
// with the base map when given the same width/height/padding.
import { SWEDEN_LAND } from "@/app/tempus/ui/biotope-map/sweden-data"

const REFERENCE_LATITUDE = 62.2
const LONGITUDE_SCALE = Math.cos((REFERENCE_LATITUDE * Math.PI) / 180)

function projected(position: readonly number[]): readonly [number, number] {
  return [position[0]! * LONGITUDE_SCALE, -position[1]!]
}

function landBounds() {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const polygon of SWEDEN_LAND) {
    for (const ring of polygon) {
      for (const position of ring) {
        const [x, y] = projected(position)
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  return { minX, minY, maxX, maxY }
}

const BOUNDS = landBounds()

export type RouteProjection = {
  toMap: (position: readonly number[]) => readonly [number, number]
  toGeoJson: (x: number, y: number) => [number, number]
}

export function createRouteProjection(
  width: number,
  height: number,
  padding: number,
): RouteProjection {
  const availableWidth = Math.max(1, width - padding * 2)
  const availableHeight = Math.max(1, height - padding * 2)
  const dataWidth = BOUNDS.maxX - BOUNDS.minX
  const dataHeight = BOUNDS.maxY - BOUNDS.minY
  const scale = Math.min(availableWidth / dataWidth, availableHeight / dataHeight)
  const offsetX = padding + (availableWidth - dataWidth * scale) / 2
  const offsetY = padding + (availableHeight - dataHeight * scale) / 2

  return {
    toMap(position) {
      const [x, y] = projected(position)
      return [offsetX + (x - BOUNDS.minX) * scale, offsetY + (y - BOUNDS.minY) * scale]
    },
    toGeoJson(x, y) {
      const projectedX = BOUNDS.minX + (x - offsetX) / scale
      const projectedY = BOUNDS.minY + (y - offsetY) / scale
      return [
        Math.round((projectedX / LONGITUDE_SCALE) * 1e6) / 1e6,
        Math.round(-projectedY * 1e6) / 1e6,
      ]
    },
  }
}
