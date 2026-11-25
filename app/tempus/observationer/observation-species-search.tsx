"use client"

import { Pager } from "@/app/components/ui/Pager"
import { useCombobox } from "@/app/components/ui/useCombobox"
import { speciesName } from "@/app/tempus/_state/tempus-context"
import type { TempusSpecies } from "@/app/lib/dal"
import { Search } from "lucide-react"

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
  label = "Art att föra in",
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
  label?: string
}) {
  const combobox = useCombobox({ options: matches, query, onPick: onAdd })

  return (
    <div ref={combobox.setWrapper} className="relative border-x border-b border-border px-3 py-2 font-display text-[9px] italic text-text-faint">
      {label}
      <span className="relative mt-1 block">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          type="search"
          value={query}
          {...combobox.inputProps}
          onChange={(event) => {
            onQueryChange(event.target.value)
            combobox.typed()
          }}
          onKeyDown={(event) => {
            combobox.inputProps.onKeyDown(event)
            // Enter utan markering för in översta träffen i stället för att skicka formuläret.
            if (event.key === "Enter" && !event.defaultPrevented && showResults) {
              event.preventDefault()
              if (matches[0]) onAdd(matches[0])
            }
          }}
          placeholder="Sök svenskt eller vetenskapligt namn"
          className="h-9 w-full rounded border border-field-border bg-surface pl-8 pr-3 font-body text-xs not-italic text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
      </span>
      {showResults && (combobox.shown || matches.length === 0) ? (
        <ul {...combobox.listProps} className="absolute inset-x-3 top-full z-10 mt-1 overflow-hidden rounded border border-border bg-surface shadow-md">
          {matches.map((item, index) => (
            <li key={item.id} {...combobox.optionProps(index)}>
              <span
                className={`block w-full cursor-pointer px-3 py-2 text-left font-display text-xs font-normal italic ${index === combobox.active ? "bg-accent-wash text-accent" : ""}`}
              >
                <span>{speciesName(item)}</span>
                <span className="ml-2 text-[10px] text-text-muted">{item.scientific_name}</span>
              </span>
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
