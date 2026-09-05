import { useState, useTransition } from "react"
import { Button } from "@/app/components/ui/Button"
import { createRouteStop } from "@/app/tempus/_actions/routes"
import type { TempusSuggestedStop } from "@/app/lib/dal"
import { km, SectionRule } from "./shared"
import { SuggestionHighlights, SuggestionNotableRecent, SuggestionBreakdown } from "./suggestion-species-results"

function SuggestionEntry({
  stop,
  routeId,
  active,
  onFocus,
  onAdded,
}: {
  stop: TempusSuggestedStop
  routeId: string
  active: boolean
  onFocus: () => void
  onAdded: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const add = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await createRouteStop({
        route: routeId,
        name: stop.locality || `Stopp ${stop.rank}`,
        location: stop.location,
      })
      if (result.error) {
        setMessage(result.error)
        return
      }
      setMessage("Tillagd.")
      onAdded()
    })
  }

  return (
    <li
      className={`border-b border-border font-display ${active ? "bg-surface-2/40" : ""}`}
      onMouseEnter={onFocus}
    >
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_3.5rem]">
        <span className="flex items-start justify-end border-r border-border px-2 py-2.5 text-[13px] italic tabular-nums text-text-faint">
          {stop.rank}
        </span>
        <span className="min-w-0 border-r border-border px-3 py-2.5">
          <span className="block text-base italic tracking-wide">
            {stop.locality || "Namnlöst område"}
          </span>
          <span className="mt-0.5 block font-mono text-xs not-italic uppercase tracking-wide text-text-faint">
            {stop.county ? `${stop.county} · ` : ""}
            {stop.species_count} arter · {km(stop.distance_along_route_m)} in ·{" "}
            ≈{Math.round(stop.detour_m)} m från vägen (fågelväg)
          </span>
        </span>
        <span
          className="flex items-start justify-center px-1 py-2.5 text-sm italic tabular-nums text-text-muted"
          title="Poäng — artvariation och rariteter"
        >
          {stop.score.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}
        </span>
      </div>

      <div className="border-t border-border py-2.5 pl-[2.75rem] pr-3">
        <SuggestionHighlights stop={stop} />
        <SuggestionNotableRecent stop={stop} />
        {expanded ? <SuggestionBreakdown stop={stop} /> : null}

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Button type="button" variant="paper" size="sm" onClick={add} disabled={pending}>
            {pending ? "Lägger till…" : "Lägg till som stopp"}
          </Button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="font-display text-xs italic text-text-muted underline decoration-dotted underline-offset-2 hover:text-text"
          >
            {expanded ? "Dölj detaljer" : "Visa detaljer"}
          </button>
          {message ? (
            <span className="font-display text-xs italic text-text-muted">
              {message}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  )
}

export type RouteSearchParams = {
  since_days: number
  num_stops: number
  max_detour_m?: number
}

export function RouteSuggestions({
  routeId,
  corridorMetres,
  onSearch,
  loading,
  error,
  searched,
  suggestions,
  activeId,
  onFocusSuggestion,
  onSuggestionAdded,
}: {
  routeId: string
  corridorMetres: number
  onSearch: (params: RouteSearchParams) => void
  loading: boolean
  error: string | null
  searched: boolean
  suggestions: TempusSuggestedStop[]
  activeId: string | null
  onFocusSuggestion: (id: string) => void
  onSuggestionAdded: () => void
}) {
  const [sinceDays, setSinceDays] = useState(30)
  const [numStops, setNumStops] = useState(5)
  const [maxDetourKm, setMaxDetourKm] = useState("")

  const search = () => {
    const params: RouteSearchParams = { since_days: sinceDays, num_stops: numStops }
    const detour = Number(maxDetourKm.replace(",", "."))
    if (maxDetourKm.trim() && Number.isFinite(detour) && detour >= 0) {
      params.max_detour_m = Math.round(detour * 1000)
    }
    onSearch(params)
  }

  return (
    <>
      <SectionRule>Ruttanalys · Artdatabanken</SectionRule>
      <div className="border-x border-b border-border">
        <p className="border-b border-border px-3 py-3 text-center font-display text-sm italic text-text-muted">
          Stopp längs korridoren, rankade främst efter artvariation och
          rariteter
        </p>

        <div className="grid border-b border-l border-t border-border font-display sm:grid-cols-3">
          <label className="flex flex-col border-b border-r border-border px-3 py-2 text-sm italic text-text-faint">
            Observationsfönster
            <select
              value={sinceDays}
              onChange={(event) => setSinceDays(Number(event.target.value))}
              className="mt-1 h-10 rounded border border-field-border bg-surface px-2 font-body text-sm not-italic text-text focus:border-accent focus:outline-none"
            >
              {[7, 14, 30, 60, 90, 180, 365].map((days) => (
                <option key={days} value={days}>
                  {days} dagar
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col border-b border-r border-border px-3 py-2 text-sm italic text-text-faint">
            Antal stopp
            <select
              value={numStops}
              onChange={(event) => setNumStops(Number(event.target.value))}
              className="mt-1 h-10 rounded border border-field-border bg-surface px-2 font-body text-sm not-italic text-text focus:border-accent focus:outline-none"
            >
              {[3, 5, 8, 10, 15, 25].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col border-b border-r border-border px-3 py-2 text-sm italic text-text-faint">
            Max avstickare (km)
            <input
              inputMode="decimal"
              value={maxDetourKm}
              onChange={(event) => setMaxDetourKm(event.target.value)}
              placeholder="valfritt"
              className="mt-1 h-10 rounded border border-field-border bg-surface px-2.5 font-body text-sm not-italic text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
          </label>
        </div>

        <p className="border-b border-l border-border px-3 py-2 font-display text-sm not-italic leading-6 text-text-muted">
          Avstickare = punktens fågelvägsavstånd från ruttlinjen, aldrig mer
          än sökkorridoren ({km(corridorMetres)}). Filtret gör bara
          nytta när det är mindre än så — sätt det till hur långt från vägen
          du faktiskt orkar svänga. Det säger inget om huruvida en väg leder
          dit.
        </p>

        <div className="flex flex-wrap items-center gap-4 border-b border-border px-3 py-3">
          <Button type="button" variant="paper" onClick={search} disabled={loading}>
            {loading ? "Söker längs rutten…" : "Sök stoppställen"}
          </Button>
          <span className="font-display text-xs italic text-text-faint">
            Direktsökning mot Artdatabanken — kan ta en stund.
          </span>
        </div>

        {error ? (
          <p
            className="border-b border-border bg-danger-wash px-3 py-2.5 font-display text-sm italic text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="px-3 py-10 text-center font-display text-sm italic text-text-muted">
            Rankar stoppställen efter artvariation och rariteter…
          </p>
        ) : searched && suggestions.length === 0 && !error ? (
          <p className="px-3 py-10 text-center font-display text-sm italic text-text-muted">
            Inga stopp hittades inom sökkorridoren. Pröva ett större fönster
            eller en bredare korridor.
          </p>
        ) : suggestions.length > 0 ? (
          <ol className="border-t border-border">
            {suggestions.map((stop) => (
              <SuggestionEntry
                key={stop.rank}
                stop={stop}
                routeId={routeId}
                active={activeId === `rank-${stop.rank}`}
                onFocus={() => onFocusSuggestion(`rank-${stop.rank}`)}
                onAdded={onSuggestionAdded}
              />
            ))}
          </ol>
        ) : null}
      </div>

      <p className="mt-2 text-right font-display text-xs italic text-text-faint">
        Punkterna är artrika platser, inte verifierade rastplatser.
      </p>
    </>
  )
}
