import type { TempusLocale } from "@/app/lib/dal"

type Position = readonly [number, number, ...number[]]

function pointInRing(point: Position, ring: readonly Position[]) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index] ?? []
    const [previousX, previousY] = ring[previous] ?? []
    if (x === undefined || y === undefined || previousX === undefined || previousY === undefined) continue
    const crosses = (y > point[1]) !== (previousY > point[1])
      && point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x
    if (crosses) inside = !inside
  }
  return inside
}

export function localeContainsPoint(locale: TempusLocale, point: Position) {
  return locale.geometry?.coordinates.some((polygon) => {
    const [outerRing, ...holes] = polygon
    return Boolean(outerRing && pointInRing(point, outerRing) && !holes.some((hole) => pointInRing(point, hole)))
  }) ?? false
}

export function localesAtPoint(locales: TempusLocale[], longitude: number, latitude: number) {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return []
  return locales.filter((locale) => localeContainsPoint(locale, [longitude, latitude]))
}

function ringCentroid(ring: readonly Position[]): Position | null {
  let twiceArea = 0
  let longitudeSum = 0
  let latitudeSum = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index]
    const next = ring[index + 1]
    if (!current || !next) continue
    const cross = current[0] * next[1] - next[0] * current[1]
    twiceArea += cross
    longitudeSum += (current[0] + next[0]) * cross
    latitudeSum += (current[1] + next[1]) * cross
  }
  if (Math.abs(twiceArea) < Number.EPSILON) return null
  return [longitudeSum / (3 * twiceArea), latitudeSum / (3 * twiceArea)]
}

/** Returns a stable point inside the locale for observation forms that require a GeoJSON Point. */
export function localeRepresentativePoint(locale: TempusLocale): Position | null {
  const polygons = locale.geometry?.coordinates ?? []
  for (const polygon of polygons) {
    const outerRing = polygon[0]
    if (!outerRing?.length) continue
    const centroid = ringCentroid(outerRing)
    if (centroid && localeContainsPoint(locale, centroid)) return centroid

    const longitudes = outerRing.map((position) => position[0])
    const latitudes = outerRing.map((position) => position[1])
    const minLongitude = Math.min(...longitudes)
    const maxLongitude = Math.max(...longitudes)
    const minLatitude = Math.min(...latitudes)
    const maxLatitude = Math.max(...latitudes)
    for (const resolution of [3, 7, 15, 31]) {
      for (let row = 0; row < resolution; row += 1) {
        for (let column = 0; column < resolution; column += 1) {
          const candidate: Position = [
            minLongitude + ((column + 0.5) / resolution) * (maxLongitude - minLongitude),
            minLatitude + ((row + 0.5) / resolution) * (maxLatitude - minLatitude),
          ]
          if (localeContainsPoint(locale, candidate)) return candidate
        }
      }
    }
  }
  return null
}
