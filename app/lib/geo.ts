/** A distance in metres as Swedish km with at most one decimal, e.g. "12,3 km". */
export function formatKm(metres: number) {
  return `${(metres / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} km`
}

/** A distance in metres: whole metres below a kilometre, otherwise as formatKm. */
export function formatDistance(metres: number) {
  return metres < 1000 ? `${Math.round(metres)} m` : formatKm(metres)
}

export type ParsedLatLon = { lat: number | null; lon: number | null }

/** Parses a lat/lon pair (accepting comma decimals); both fields must be empty or both filled and in range. */
export function parseLatLon(latInput: string, lonInput: string): ParsedLatLon | { error: string } {
  const parse = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return null
    return Number(trimmed.replace(",", "."))
  }
  const lat = parse(latInput)
  const lon = parse(lonInput)
  if ((lat === null) !== (lon === null)) {
    return { error: "Ange både latitud och longitud, eller ingen." }
  }
  if (
    (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
    (lon !== null && (!Number.isFinite(lon) || Math.abs(lon) > 180))
  ) {
    return { error: "Ogiltig koordinat." }
  }
  return { lat, lon }
}

/** A position stored as one string, "59.123456, 18.123456". */
export function latLonString(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}

/** The lat and lon of a "lat, lon" string as entered text, or two empty strings for anything else. */
export function splitLatLonString(value: string): [string, string] {
  const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  return match ? [match[1], match[2]] : ["", ""]
}

/** A GeoJSON position in degrees and minutes, as on a map's margin: "58°40′ N 16°18′ Ö". */
export function formatPosition([lon, lat]: [number, number]): string {
  const part = (value: number) => {
    const degrees = Math.floor(Math.abs(value))
    const minutes = Math.round((Math.abs(value) - degrees) * 60)
    // Sixty minutes is the next whole degree.
    return minutes === 60 ? `${degrees + 1}°00′` : `${degrees}°${String(minutes).padStart(2, "0")}′`
  }
  return `${part(lat)} ${lat >= 0 ? "N" : "S"} ${part(lon)} ${lon >= 0 ? "Ö" : "V"}`
}
