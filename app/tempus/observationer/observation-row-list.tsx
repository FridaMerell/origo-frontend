"use client"

import { Icon } from "@/app/components/ui/Icon"
import { speciesName } from "@/app/tempus/_state/tempus-context"
import type { TempusSpecies } from "@/app/lib/dal"

export type ObservationRow = {
  key: string
  speciesId: string
  count: string
  notes: string
}

export function ObservationRowList({
  rows,
  selectedSpecies,
  rowErrors,
  onUpdateRow,
  onRemoveRow,
}: {
  rows: ObservationRow[]
  selectedSpecies: Map<string, TempusSpecies>
  rowErrors: Record<string, string>
  onUpdateRow: (key: string, patch: Partial<ObservationRow>) => void
  onRemoveRow: (key: string) => void
}) {
  return (
    <section className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="hidden grid-cols-[2.25rem_minmax(12rem,1.5fr)_6rem_minmax(10rem,1fr)_2.5rem] border-l border-t border-border font-display text-[9px] italic text-text-muted sm:grid">
        <span className="border-b border-r border-border px-2 py-1.5 text-center">Nr</span>
        <span className="border-b border-r border-border px-3 py-1.5">Artens namn</span>
        <span className="border-b border-r border-border px-2 py-1.5 text-center">Antal</span>
        <span className="border-b border-r border-border px-3 py-1.5">Anteckning</span>
        <span className="border-b border-r border-border" />
      </div>

      {rows.length > 0 ? (
        <ol className="border-l border-t border-border sm:border-t-0">
          {rows.map((row, index) => {
            const match = selectedSpecies.get(row.speciesId)
            return (
              <li key={row.key} className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] border-b border-border font-display sm:grid-cols-[2.25rem_minmax(12rem,1.5fr)_6rem_minmax(10rem,1fr)_2.5rem]">
                <span className="row-span-3 flex justify-end border-r border-border px-2 py-2 text-[10px] italic text-text-faint sm:row-span-1">
                  {index + 1}
                </span>
                <span className="min-w-0 border-r border-border px-3 py-1.5">
                  <span className="block truncate text-sm italic">{match ? speciesName(match) : "Okänd art"}</span>
                  {match ? <span className="block truncate text-[10px] italic text-text-muted">{match.scientific_name}</span> : null}
                </span>
                <input
                  inputMode="numeric"
                  value={row.count}
                  onChange={(event) => onUpdateRow(row.key, { count: event.target.value })}
                  placeholder="Antal"
                  aria-label={`Antal för ${match ? speciesName(match) : "art"}`}
                  className="col-start-2 row-start-2 h-8 min-w-0 border-r border-t border-border bg-transparent px-3 text-xs text-text placeholder:text-text-faint focus:bg-surface-2 focus:outline-none sm:col-start-3 sm:row-start-1 sm:h-auto sm:border-t-0 sm:text-center"
                />
                <input
                  value={row.notes}
                  onChange={(event) => onUpdateRow(row.key, { notes: event.target.value })}
                  placeholder="Anteckning (valfritt)"
                  aria-label={`Anteckning för ${match ? speciesName(match) : "art"}`}
                  className="col-start-2 row-start-3 h-8 min-w-0 border-r border-t border-border bg-transparent px-3 text-xs italic text-text placeholder:text-text-faint focus:bg-surface-2 focus:outline-none sm:col-start-4 sm:row-start-1 sm:h-auto sm:border-t-0"
                />
                <button
                  type="button"
                  onClick={() => onRemoveRow(row.key)}
                  aria-label="Ta bort art"
                  className="col-start-3 row-span-3 row-start-1 flex items-center justify-center border-r border-border text-text-faint hover:bg-danger-wash hover:text-danger sm:col-start-5 sm:row-span-1"
                >
                  <Icon name="x" size={14} />
                </button>
                {rowErrors[row.key] ? (
                  <p className="col-start-2 col-end-4 border-r border-t border-border px-3 py-1 text-[10px] text-danger sm:col-start-2 sm:col-end-6">
                    {rowErrors[row.key]}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="border-l border-t border-border" aria-label="Inga arter tillagda än">
          {[1, 2, 3].map((line) => (
            <div key={line} className="grid h-10 grid-cols-[2.25rem_minmax(0,1fr)_6rem_minmax(10rem,1fr)_2.5rem] border-b border-border">
              <span className="border-r border-border" />
              <span className="border-r border-border" />
              <span className="border-r border-border" />
              <span className="border-r border-border" />
              <span className="border-r border-border" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
