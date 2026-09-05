import { useDeferredValue, type RefObject } from "react"
import { Icon } from "@/app/components/ui/Icon"
import { Pager } from "@/app/components/ui/Pager"
import { speciesName } from "@/app/tempus/_state/tempus-context"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"

export type PresetSpecies = { id: string; label: string; scientific: string }

export function SpeciesPicker({
  searchRef,
  query,
  onQueryChange,
  picked,
  onPick,
  onClearError,
}: {
  searchRef: RefObject<HTMLInputElement | null>
  query: string
  onQueryChange: (value: string) => void
  picked: PresetSpecies | null
  onPick: (species: PresetSpecies | null) => void
  onClearError: () => void
}) {
  const deferredQuery = useDeferredValue(query)

  const {
    results: matches,
    page: speciesPage,
    setPage: setSpeciesPage,
    totalPages: speciesTotalPages,
    loading: speciesLoading,
  } = useSpeciesPage({
    search: deferredQuery,
    pageSize: 8,
    enabled: deferredQuery.trim().length >= 2 && !picked,
  })

  return (
    <div className="relative flex flex-col gap-1.5 text-sm font-medium">
      Art
      {picked ? (
        <div className="flex items-center justify-between gap-3 rounded border border-field-border bg-surface-2 px-3 py-2.5">
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
            <Icon name="x" size={15} />
          </button>
        </div>
      ) : (
        <span className="relative">
          <Icon
            name="search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Sök art"
            autoComplete="off"
            className="w-full rounded border border-field-border bg-surface py-2.5 pl-9 pr-3 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </span>
      )}
      {deferredQuery.trim().length >= 2 && !picked ? (
        <div className="mt-1 overflow-hidden rounded border border-border bg-surface shadow-md">
        <ul className="max-h-64 overflow-y-auto">
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onPick({
                    id: item.id,
                    label: speciesName(item),
                    scientific: item.scientific_name,
                  })
                  onQueryChange("")
                  onClearError()
                }}
                className="block w-full border-b border-border px-3 py-2 text-left text-sm font-normal last:border-b-0 hover:bg-accent-wash hover:text-accent"
              >
                <span className="font-medium">{speciesName(item)}</span>
                <span className="ml-2 font-mono text-[11px] text-text-muted">
                  {item.scientific_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {speciesLoading ? <p className="px-3 py-2 text-xs text-text-muted">Hämtar arter…</p> : null}
        {!speciesLoading && matches.length === 0 ? <p className="px-3 py-2 text-xs text-text-muted">Inga arter matchar.</p> : null}
        <Pager
          page={speciesPage}
          totalPages={speciesTotalPages}
          onPageChange={setSpeciesPage}
          label={`${speciesPage} / ${speciesTotalPages}`}
          className="flex items-center justify-between border-t border-border px-2 py-1.5 text-xs text-text-muted"
        />
        </div>
      ) : null}
    </div>
  )
}
