import type { TempusRoute, TempusRouteStop } from "@/app/lib/dal"
export { formatKm as km } from "@/app/tempus/formatters"

export const RED_LIST_LABELS: Record<string, string> = {
  NT: "Nära hotad",
  VU: "Sårbar",
  EN: "Starkt hotad",
  CR: "Akut hotad",
  RE: "Nationellt utdöd",
  DD: "Kunskapsbrist",
}

export function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
}

// Build a Google Maps directions URL for the route. Prefers the user's ordered
// stops; falls back to the raw polyline endpoints. Google caps the `waypoints`
// param at 9 intermediate points, so we evenly sample when there are more.
export function googleMapsDirectionsUrl(
  route: TempusRoute,
  stops: TempusRouteStop[],
): string | null {
  const asLatLng = (coords: [number, number]) => `${coords[1]},${coords[0]}`

  let points: string[]
  if (stops.length > 0) {
    points = stops
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((stop) => asLatLng(stop.location.coordinates))
  } else {
    const line = route.geometry?.coordinates ?? []
    if (line.length < 2) return null
    points = line.map(asLatLng)
  }

  if (points.length < 2) return null

  const origin = points[0]
  const destination = points[points.length - 1]
  let middle = points.slice(1, -1)
  if (middle.length > 9) {
    const step = (middle.length - 1) / 9
    middle = Array.from({ length: 9 }, (_, i) => middle[Math.round(i * step)])
  }

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  })
  if (middle.length > 0) params.set("waypoints", middle.join("|"))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function RedListMark({ category }: { category: string }) {
  if (!category) return null
  return (
    <span
      title={RED_LIST_LABELS[category] ?? category}
      className="ml-1.5 border-b border-danger font-mono text-xs not-italic uppercase tracking-wide text-danger"
    >
      {category}
    </span>
  )
}

export function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-l border-r border-border px-3 py-1.5 font-display text-xs italic text-text-faint">
      {children}
    </p>
  )
}
