import { useDeferredValue } from "react"
import { CategoryTreeSelect } from "@/app/components/ui/CategoryTreeSelect"
import { Pager } from "@/app/components/ui/Pager"
import { speciesName } from "@/app/tempus/_state/tempus-context"
import type { TempusSpecies, TempusSpeciesCategory } from "@/app/lib/dal"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"
import { CsvImport, type FormMessageCallbacks } from "./csv-import"

export function SpeciesSelector({
  categories,
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  selected,
  onToggleSpecies,
  onToggleVisible,
  onSelectAllInCategory,
  onCsvMatched,
  messages,
}: {
  categories: TempusSpeciesCategory[]
  query: string
  onQueryChange: (value: string) => void
  categoryId: string | null
  onCategoryChange: (id: string | null) => void
  selected: Set<string>
  onToggleSpecies: (id: string, item?: TempusSpecies) => void
  onToggleVisible: (visibleSpecies: TempusSpecies[], allVisibleSelected: boolean) => void
  onSelectAllInCategory: (category: TempusSpeciesCategory) => void
  onCsvMatched: (matchedIds: string[]) => void
  messages: FormMessageCallbacks
}) {
  const deferredQuery = useDeferredValue(query)
  const activeCategory = categories.find((item) => item.id === categoryId) ?? null

  const {
    results: visibleSpecies,
    count: visibleSpeciesCount,
    page: speciesPage,
    setPage: setSpeciesPage,
    totalPages: speciesTotalPages,
    loading: speciesLoading,
    error: speciesError,
  } = useSpeciesPage({
    search: deferredQuery,
    categoryTaxonId: activeCategory?.taxon_id,
  })

  const allVisibleSelected =
    visibleSpecies.length > 0 && visibleSpecies.every((item) => selected.has(item.id))

  return (
    <section className="border-t border-border lg:col-start-1 lg:row-start-2">
      <div className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[.14em] text-secondary">02</span>
          <h2 className="mt-1 font-display text-2xl font-semibold">Välj arter</h2>
        </div>
      </div>

      <CsvImport onMatched={onCsvMatched} messages={messages} />

      <div className="px-4 py-4 sm:px-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <label>
            <span className="sr-only">Sök art</span>
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Sök namn eller Dyntaxa-ID"
              className="w-full rounded-none border border-field-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
          </label>
          <div className="min-w-0">
            <CategoryTreeSelect
              categories={categories}
              value={categoryId}
              onChange={onCategoryChange}
              placeholder="Alla kategorier"
              allLabel="Alla kategorier"
              searchPlaceholder="Sök kategori eller grupp"
            />
          </div>
        </div>

        {activeCategory ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <span className="text-xs text-text-muted">Kategori: {activeCategory.label}</span>
            <button
              type="button"
              onClick={() => onSelectAllInCategory(activeCategory)}
              disabled={speciesLoading}
              className="font-medium text-accent hover:text-accent-hover disabled:text-text-faint"
            >
              Välj alla i kategorin
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between border-b border-border pb-2 text-xs text-text-muted">
          <span>{visibleSpeciesCount} arter</span>
          <button type="button" onClick={() => onToggleVisible(visibleSpecies, allVisibleSelected)} disabled={visibleSpecies.length === 0} className="font-medium text-accent hover:text-accent-hover disabled:text-text-faint">
            {allVisibleSelected ? "Avmarkera visade" : "Välj alla visade"}
          </button>
        </div>

        <div className="max-h-[26rem] overflow-y-auto" style={{ contentVisibility: "auto" }}>
          {speciesLoading ? (
            <p className="py-8 text-center text-sm text-text-muted">Hämtar arter…</p>
          ) : visibleSpecies.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">Inga arter matchar filtret.</p>
          ) : visibleSpecies.map((item) => (
            <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-1 py-3 last:border-b-0 hover:bg-accent-wash">
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => onToggleSpecies(item.id, item)} className="size-4 accent-[var(--accent)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{speciesName(item)}</span>
                <span className="block truncate font-mono text-[11px] text-text-muted">{item.scientific_name} · {item.dyntaxa_taxon_id}</span>
              </span>
            </label>
          ))}
        </div>
        {speciesError ? <p className="border-t border-border py-2 text-sm text-danger">{speciesError}</p> : null}
        <Pager
          page={speciesPage}
          totalPages={speciesTotalPages}
          onPageChange={setSpeciesPage}
          disabled={speciesLoading}
          className="flex items-center justify-between border-t border-border pt-3 text-xs text-text-muted"
          buttonClassName="font-medium text-accent disabled:text-text-faint"
        />
      </div>
    </section>
  )
}
