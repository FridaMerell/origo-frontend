import type { TempusSuggestedStop } from "@/app/lib/dal"
import { RedListMark, formatDate } from "./shared"

export function SuggestionHighlights({ stop }: { stop: TempusSuggestedStop }) {
  return stop.highlights.length > 0 ? (
    <ul className="flex flex-col gap-2">
      {stop.highlights.map((highlight) => (
        <li key={highlight.taxon_id} className="leading-5">
          <span className="text-[15px] italic tracking-wide">
            {highlight.vernacular_name || highlight.scientific_name}
          </span>
          <span className="ml-1.5 text-xs italic text-text-muted">
            {highlight.scientific_name}
          </span>
          <RedListMark category={highlight.red_list_category} />
          <span className="block text-xs italic text-text-muted">
            {highlight.reason}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-xs italic text-text-muted">
      Inga utmärkande arter drev poängen här.
    </p>
  )
}

export function SuggestionNotableRecent({ stop }: { stop: TempusSuggestedStop }) {
  if (stop.notable_recent.length === 0) return null
  return (
    <div className="mt-2.5 border-l border-border pl-2.5">
      <p className="font-mono text-xs not-italic uppercase tracking-wide text-text-faint">
        Setts nyligen
      </p>
      <ul className="mt-1 flex flex-col gap-0.5 text-xs italic text-text-muted">
        {stop.notable_recent.map((entry, index) => (
          <li key={`${entry.scientific_name}-${index}`}>
            {formatDate(entry.date)} ·{" "}
            {entry.vernacular_name || entry.scientific_name}
            {entry.locality ? ` · ${entry.locality}` : ""}
            <RedListMark category={entry.red_list_category} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SuggestionBreakdown({ stop }: { stop: TempusSuggestedStop }) {
  return (
    <div className="mt-2.5 flex flex-col gap-2 text-xs italic text-text-muted">
      {stop.top_species.length > 0 ? (
        <p>
          <span className="font-mono text-xs not-italic uppercase tracking-wide text-text-faint">
            Vanligast rapporterade:
          </span>{" "}
          {stop.top_species
            .map(
              (entry) =>
                `${entry.vernacular_name || entry.scientific_name} (${entry.count})`,
            )
            .join(", ")}
        </p>
      ) : null}
      <p>
        <span className="font-mono text-xs not-italic uppercase tracking-wide text-text-faint">
          Poängkomponenter:
        </span>{" "}
        artrikedom {stop.breakdown.richness_term.toFixed(1)} · jämnhet{" "}
        {stop.breakdown.evenness_term.toFixed(1)} · raritet{" "}
        {stop.breakdown.rarity_term.toFixed(1)} · aktualitet{" "}
        {stop.breakdown.recency_term.toFixed(1)}
      </p>
    </div>
  )
}
