"use client"

import { Icon } from "@/app/components/ui/Icon"
import { Pager } from "@/app/components/ui/Pager"
import { speciesName } from "@/app/tempus/_state/tempus-context"
import type { TempusSpecies } from "@/app/lib/dal"

export function ObservationSpeciesSearch({
  query,
  onQueryChange,
  showResults,
  matches,
  loading,
  page,
  onPageChange,
  totalPages,
  onAdd,
}: {
  query: string
  onQueryChange: (value: string) => void
  showResults: boolean
  matches: TempusSpecies[]
  loading: boolean
  page: number
  onPageChange: (page: number) => void
  totalPages: number
  onAdd: (item: TempusSpecies) => void
}) {
  return (
    <div className="relative border-x border-b border-border px-3 py-2 font-display text-[9px] italic text-text-faint">
      Art att föra in
      <span className="relative mt-1 block">
        <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Sök svenskt eller vetenskapligt namn"
          className="h-9 w-full rounded border border-field-border bg-surface pl-8 pr-3 font-body text-xs not-italic text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
      </span>
      {showResults ? (
        <ul className="absolute inset-x-3 top-full z-10 mt-1 overflow-hidden rounded border border-border bg-surface shadow-md">
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onAdd(item)}
                className="block w-full border-b border-border px-3 py-2 text-left font-display text-xs font-normal italic last:border-b-0 hover:bg-accent-wash hover:text-accent"
              >
                <span>{speciesName(item)}</span>
                <span className="ml-2 text-[10px] text-text-muted">{item.scientific_name}</span>
              </button>
            </li>
          ))}
          {loading ? <li className="px-3 py-2 text-xs text-text-muted">Hämtar arter…</li> : null}
          {!loading && matches.length === 0 ? <li className="px-3 py-2 text-xs text-text-muted">Inga arter matchar.</li> : null}
          <Pager
            as="li"
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            label={`${page} / ${totalPages}`}
            className="flex items-center justify-between border-t border-border px-2 py-1.5 text-xs text-text-muted"
          />
        </ul>
      ) : null}
    </div>
  )
}
