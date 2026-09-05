import { useEffect, useRef, useState, type RefObject } from "react"
import { Pager } from "@/app/components/ui/Pager"
import { speciesName } from "@/app/tempus/_state/tempus-context"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"
import { Search, X } from "lucide-react"

export type PresetChecklistItem = {
  id: string
  checklistId: string
  name: string
}

export type PresetSpecies = {
  id: string
  label: string
  scientific: string
  checklistItems?: PresetChecklistItem[]
}

export function SpeciesPicker({
  searchRef,
  query,
  onQueryChange,
  picked,
  onPick,
  onClearError,
  onSubmit,
}: {
  searchRef: RefObject<HTMLInputElement | null>
  query: string
  onQueryChange: (value: string) => void
  picked: PresetSpecies | null
  onPick: (species: PresetSpecies | null) => void
  onClearError: () => void
  onSubmit: () => void
}) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const selectedRef = useRef<HTMLDivElement>(null)
  const activeOptionRef = useRef<HTMLButtonElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const isDebouncing = query !== debouncedQuery

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    if (!picked) return
    const frame = requestAnimationFrame(() => selectedRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [picked])

  const {
    results: matches,
    page: speciesPage,
    setPage: setSpeciesPage,
    totalPages: speciesTotalPages,
    loading: speciesLoading,
  } = useSpeciesPage({
    search: debouncedQuery,
    pageSize: 8,
    enabled: debouncedQuery.trim().length >= 2 && !picked,
  })

  useEffect(() => {
    setActiveIndex(-1)
  }, [debouncedQuery, matches.length])

  useEffect(() => {
    activeOptionRef.current?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const selectSpecies = (item: typeof matches[number]) => {
    onPick({
      id: item.id,
      label: speciesName(item),
      scientific: item.scientific_name,
      checklistItems: (item.checklists ?? []).map((checklist) => ({
        id: checklist.item_id,
        checklistId: checklist.id,
        name: checklist.name,
      })),
    })
    onQueryChange("")
    onClearError()
  }

  return (
    <div className="relative flex flex-col gap-1.5 text-sm font-medium">
      <div className="flex items-center gap-1.5">
        Art
        <span className="group relative inline-flex">
          <button
            type="button"
            aria-label="Hjälp för artsök"
            className="flex size-4 items-center justify-center rounded-full border border-field-border text-[10px] text-text-muted hover:text-text focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
          >
            ?
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute left-0 top-full z-10 mt-2 hidden w-52 rounded border border-border bg-surface-2 px-2.5 py-2 text-xs font-normal text-text shadow-md group-hover:block group-focus-within:block"
          >
            Använd ↑ och ↓ för att välja art. Enter väljer, och Enter igen sparar.
          </span>
        </span>
      </div>
      {picked ? (
        <div
          ref={selectedRef}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              onSubmit()
            }
          }}
          className="flex items-center justify-between gap-3 rounded border border-field-border bg-surface-2 px-3 py-2.5 focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{picked.label}</span>
            <span className="block truncate font-mono text-[11px] text-text-muted">
              {picked.scientific}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-label="Byt art"
            className="shrink-0 text-text-faint hover:text-text"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <span className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (isDebouncing || matches.length === 0) return
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setActiveIndex((index) => Math.min(index + 1, matches.length - 1))
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setActiveIndex((index) => index === -1 ? matches.length - 1 : Math.max(index - 1, 0))
              } else if (event.key === "Enter" && activeIndex >= 0) {
                event.preventDefault()
                selectSpecies(matches[activeIndex])
              }
            }}
            placeholder="Sök art"
            autoComplete="off"
            role="combobox"
            aria-expanded={query.trim().length >= 2 && !isDebouncing && matches.length > 0}
            aria-controls="species-search-results"
            aria-activedescendant={activeIndex >= 0 ? `species-search-option-${activeIndex}` : undefined}
            className="w-full rounded border border-field-border bg-surface py-2.5 pl-9 pr-3 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </span>
      )}
      {query.trim().length >= 2 && !picked ? (
        <div className="mt-1 overflow-hidden rounded border border-border bg-surface shadow-md">
        {!isDebouncing ? (
          <ul id="species-search-results" role="listbox" className="max-h-64 overflow-y-auto">
            {matches.map((item, index) => (
              <li key={item.id} role="option" aria-selected={activeIndex === index}>
                <button
                  id={`species-search-option-${index}`}
                  ref={activeIndex === index ? activeOptionRef : null}
                  type="button"
                  onClick={() => selectSpecies(item)}
                  className={`block w-full border-b border-border px-3 py-2 text-left text-sm font-normal last:border-b-0 hover:bg-accent-wash hover:text-accent ${activeIndex === index ? "bg-accent-wash text-accent" : ""}`}
                >
                  <span className="font-medium">{speciesName(item)}</span>
                  <span className="ml-2 font-mono text-[11px] text-text-muted">
                    {item.scientific_name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {isDebouncing || speciesLoading ? <p className="px-3 py-2 text-xs text-text-muted">Söker arter…</p> : null}
        {!isDebouncing && !speciesLoading && matches.length === 0 ? <p className="px-3 py-2 text-xs text-text-muted">Inga arter matchar.</p> : null}
        {!isDebouncing ? (
          <Pager
            page={speciesPage}
            totalPages={speciesTotalPages}
            onPageChange={setSpeciesPage}
            label={`${speciesPage} / ${speciesTotalPages}`}
            className="flex items-center justify-between border-t border-border px-2 py-1.5 text-xs text-text-muted"
          />
        ) : null}
        </div>
      ) : null}
    </div>
  )
}
