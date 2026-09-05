import Link from "next/link"
import type { TempusRoute } from "@/app/lib/dal"
import { formatDate, km } from "./shared"

export function RouteTopBar({
  mapsUrl,
  mutating,
  onRemoveRoute,
}: {
  mapsUrl: string | null
  mutating: boolean
  onRemoveRoute: () => void
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <Link
        href="/rutt"
        className="font-mono text-xs uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent"
      >
        ‹ Rutter
      </Link>
      <div className="flex items-baseline gap-4">
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text-muted hover:text-accent"
          >
            Öppna i Google Maps
          </a>
        ) : null}
        <button
          type="button"
          onClick={onRemoveRoute}
          disabled={mutating}
          className="text-sm text-text-muted hover:text-danger disabled:opacity-50"
        >
          Ta bort
        </button>
      </div>
    </div>
  )
}

export function RouteHeader({
  route,
  routePoints,
  stopsCount,
}: {
  route: TempusRoute
  routePoints: number
  stopsCount: number
}) {
  const plannedDate = formatDate(route.planned_date)

  return (
      <header className="px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
        <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-xs italic text-text-faint">
          <span>Ruttförteckning</span>
          <span>Blad {route.id.slice(0, 6).toUpperCase()}</span>
        </div>

        <div className="border-b border-border px-3 py-5 text-center sm:py-7">
          <h1 className="font-display text-3xl font-medium italic tracking-wide sm:text-4xl">
            {route.name}
          </h1>
          {plannedDate ? (
            <p className="mt-1.5 font-display text-sm italic text-text-muted">
              Planerad {plannedDate}
            </p>
          ) : null}
        </div>

        <dl className="grid border-l border-t border-border font-display sm:grid-cols-4">
          {[
            ["Planerad dag", plannedDate ?? "—"],
            ["Sökkorridor", km(route.corridor_metres)],
            ["Ruttpunkter", String(routePoints)],
            ["Stopp", stopsCount ? String(stopsCount) : "—"],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-r border-border px-3 py-2">
              <dt className="text-xs italic text-text-faint">{label}</dt>
              <dd className="mt-0.5 text-xs italic">{value}</dd>
            </div>
          ))}
        </dl>
      </header>
  )
}
