import type { TempusRoute, TempusRouteStop } from "@/app/lib/dal"
import { RouteMap, type RouteMapMarker } from "../route-map"
import { SectionRule } from "./shared"

export function RouteStops({
  route,
  stops,
  suggestionMarkers,
  activeId,
  mutating,
  onRemoveStop,
}: {
  route: TempusRoute
  stops: TempusRouteStop[]
  suggestionMarkers: RouteMapMarker[]
  activeId: string | null
  mutating: boolean
  onRemoveStop: (stopId: string) => void
}) {
  return (
    <>
      <SectionRule>Ruttkarta</SectionRule>
      <div className="border-x border-b border-border bg-surface-2/20 px-3 py-4">
        <RouteMap
          geometry={route.geometry}
          stops={stops}
          suggestions={suggestionMarkers}
          activeId={activeId}
          frame={false}
          width={620}
          height={520}
          className="mx-auto max-w-lg"
        />
      </div>

      <SectionRule>Stopp längs rutten</SectionRule>
      {stops.length === 0 ? (
        <div className="border-x border-b border-border">
          {[0, 1, 2].map((line) => (
            <div
              key={line}
              className="grid h-10 grid-cols-[2.75rem_minmax(0,1fr)_2.5rem] border-b border-border last:border-b-0"
            >
              <span className="border-r border-border" />
              <span className="border-r border-border" />
              <span />
            </div>
          ))}
          <p className="border-t border-border px-3 py-3 text-center font-display text-xs italic text-text-muted">
            Inga stopp än. Välj bland förslagen nedan.
          </p>
        </div>
      ) : (
        <ol className="border-x border-border font-display">
          {stops.map((stop, index) => (
            <li
              key={stop.id}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.5rem] border-b border-border"
            >
              <span className="flex items-center justify-end border-r border-border px-2 py-2.5 text-xs italic tabular-nums text-text-faint">
                {stop.sequence || index + 1}
              </span>
              <span className="min-w-0 border-r border-border px-3 py-2.5 text-[15px] italic tracking-wide">
                {stop.name}
              </span>
              <button
                type="button"
                onClick={() => onRemoveStop(stop.id)}
                disabled={mutating}
                aria-label={`Ta bort ${stop.name}`}
                className="font-display text-lg italic text-text-faint hover:bg-danger-wash hover:text-danger disabled:opacity-50"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
