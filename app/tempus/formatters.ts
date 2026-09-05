export function formatKm(metres: number) {
  return `${(metres / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} km`
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
