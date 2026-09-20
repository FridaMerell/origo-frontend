"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import type {
  TempusCategoryObservationsPage,
  TempusChecklist,
  TempusObservation,
  TempusObservationCategory,
  TempusObservationCategoryPage,
  TempusPage,
} from "@/app/lib/dal"
import { formatDateLongOrNull } from "@/app/lib/formatters"
import { LOCALE_ATLAS_PAGE_SIZE } from "./locale-atlas-config"
import { LocaleAtlasPagination } from "./locale-atlas-pagination"

type LocaleAtlasPanelProps = {
  checklistsPage: TempusPage<TempusChecklist>
  categoryPage: TempusObservationCategoryPage | null
  categoryPageNumber: number
  onCategoryPageChange: (page: number) => void
  activeCategory: TempusObservationCategory | null
  activeCategoryLabel: string
  observationsOpen: boolean
  onCategorySelect: (category: TempusObservationCategory, label: string) => void
  onCloseObservations: () => void
  observationsPage: TempusCategoryObservationsPage | null
  activeObservationPage: number
  onObservationPageChange: (page: number) => void
  selectedObservationId: string | null
  onObservationSelect: (id: string) => void
}

export function LocaleAtlasPanel({
  checklistsPage,
  categoryPage,
  categoryPageNumber,
  onCategoryPageChange,
  activeCategory,
  activeCategoryLabel,
  observationsOpen,
  onCategorySelect,
  onCloseObservations,
  observationsPage,
  activeObservationPage,
  onObservationPageChange,
  selectedObservationId,
  onObservationSelect,
}: LocaleAtlasPanelProps) {
  return (
    <aside className="border-y border-[#857354] px-0 py-3 md:my-0 md:py-0">
      <section className="font-display italic leading-6" aria-label="Notarum Explicatio">
        {observationsOpen ? (
          <ObservationList
            category={activeCategory}
            categoryLabel={activeCategoryLabel}
            observationsPage={observationsPage}
            activePage={activeObservationPage}
            selectedObservationId={selectedObservationId}
            onClose={onCloseObservations}
            onPageChange={onObservationPageChange}
            onSelect={onObservationSelect}
          />
        ) : (
          <CategoryPicker
            categoryPage={categoryPage}
            pageNumber={categoryPageNumber}
            activeCategory={activeCategory}
            onPageChange={onCategoryPageChange}
            onSelect={onCategorySelect}
          />
        )}
      </section>

      {!observationsOpen ? <ChecklistList checklists={checklistsPage.results} /> : null}
    </aside>
  )
}

type CategoryPickerProps = {
  categoryPage: TempusObservationCategoryPage | null
  pageNumber: number
  activeCategory: TempusObservationCategory | null
  onPageChange: (page: number) => void
  onSelect: (category: TempusObservationCategory, label: string) => void
}

function CategoryPicker({
  categoryPage,
  pageNumber,
  activeCategory,
  onPageChange,
  onSelect,
}: CategoryPickerProps) {
  const categories = categoryPage?.results ?? []
  const pageCount = Math.max(1, Math.ceil((categoryPage?.count ?? 0) / LOCALE_ATLAS_PAGE_SIZE.categories))

  return (
    <>
      <h3 className="border-b border-[#857354] px-4 pb-2 pt-3 text-left text-lg font-medium tracking-[.05em]">
        Notarum Explicatio
      </h3>

      {categoryPage === null ? (
        <PanelMessage>Hämtar observationer…</PanelMessage>
      ) : categories.length === 0 ? (
        <PanelMessage>Inga observationskategorier är registrerade för platsen.</PanelMessage>
      ) : (
        <nav aria-label="Välj observationskategori">
          <ol className="border-b border-[#b9a779]/60">
            {categories.map(({ category, obs_count: observationCount }, index) => {
              const categoryIndex = (pageNumber - 1) * LOCALE_ATLAS_PAGE_SIZE.categories + index
              const label = legendLabel(categoryIndex)
              const isActive = category.id === activeCategory?.id

              return (
                <li key={category.id} className="border-t border-[#b9a779]/60 first:border-t-0">
                  <button
                    type="button"
                    onClick={() => onSelect(category, label)}
                    aria-pressed={isActive}
                    className="grid w-full grid-cols-[2rem_minmax(0,1fr)] text-left text-sm focus-visible:outline focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    <span className={`flex min-h-11 items-start justify-center border-r border-[#b9a779]/60 pt-2 font-display font-bold italic ${isActive ? "text-[#9b4d35]" : "text-text-muted"}`}>
                      {label}.
                    </span>
                    <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 px-3 py-2">
                      <span className={isActive ? "font-medium text-[#342b20]" : ""}>{category.label}</span>
                      <span className="text-xs text-text-muted">
                        {observationCount} {observationCount === 1 ? "observation" : "observationer"}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <LocaleAtlasPagination
            page={pageNumber}
            pageCount={pageCount}
            ariaLabel="Bläddra kategorier"
            onPageChange={onPageChange}
          />
        </nav>
      )}
    </>
  )
}

type ObservationListProps = {
  category: TempusObservationCategory | null
  categoryLabel: string
  observationsPage: TempusCategoryObservationsPage | null
  activePage: number
  selectedObservationId: string | null
  onClose: () => void
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
}

function ObservationList({
  category,
  categoryLabel,
  observationsPage,
  activePage,
  selectedObservationId,
  onClose,
  onPageChange,
  onSelect,
}: ObservationListProps) {
  const observations = observationsPage?.results ?? []
  const pageCount = Math.max(1, Math.ceil((observationsPage?.count ?? 0) / LOCALE_ATLAS_PAGE_SIZE.observations))
  const title = category ? `${categoryLabel}. ${category.label}` : "Observationer"

  return (
    <>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 border-b border-[#857354] px-4 py-2 text-sm">
        <button type="button" onClick={onClose} className="font-display italic text-text-muted hover:text-accent">
          ← Kategorier
        </button>
        <span className="min-w-0 text-right font-medium">{title}</span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_2.85rem] border-b border-[#857354] px-4 py-1 font-display text-[0.65rem] uppercase tracking-[.08em] text-text-muted">
        <span>Art</span>
        <span className="text-right">Nr.</span>
      </div>

      {observationsPage === null ? (
        <PanelMessage>Hämtar observationer…</PanelMessage>
      ) : observations.length === 0 ? (
        <PanelMessage>Inga observationer är registrerade i kategorin.</PanelMessage>
      ) : (
        <ol>
          {observations.map((observation, index) => {
            const observationNumber = (activePage - 1) * LOCALE_ATLAS_PAGE_SIZE.observations + index + 1
            return (
              <ObservationRow
                key={observation.id}
                observation={observation}
                label={`${categoryLabel}.${observationNumber}`}
                selected={observation.id === selectedObservationId}
                onSelect={onSelect}
              />
            )
          })}
        </ol>
      )}

      <LocaleAtlasPagination
        page={activePage}
        pageCount={pageCount}
        ariaLabel="Bläddra observationer"
        onPageChange={onPageChange}
      />
    </>
  )
}

function ObservationRow({
  observation,
  label,
  selected,
  onSelect,
}: {
  observation: TempusObservation
  label: string
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_2.85rem] border-b border-[#b9a779]/60">
      <div className="min-w-0 px-4 py-1.5">
        <button
          type="button"
          onClick={() => onSelect(observation.id)}
          aria-pressed={selected}
          className={`min-w-0 text-left focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? "text-accent" : ""}`}
        >
          {observation.species_detail.swedish_name || "Okänd art"}
        </button>
        <p className="mt-0.5 text-xs text-text-muted">
          {formatDateLongOrNull(observation.observed_at) ?? "utan datum"}
          {observation.count ? `, ${observation.count} ex` : ""}
        </p>
        {selected ? (
          <div className="mt-2 border-l border-accent pl-2 text-xs text-text-muted">
            <p className="mb-1">{observation.notes || "Ingen anteckning."}</p>
            <Link href={`/observationer/${observation.id}`} className="text-text hover:text-accent">
              Notis
            </Link>
          </div>
        ) : null}
      </div>
      <span className="flex justify-end border-l border-[#b9a779]/60 px-2 pt-2 font-display text-base font-bold italic text-[#9b4d35]">
        {label}
      </span>
    </li>
  )
}

function ChecklistList({ checklists }: { checklists: TempusChecklist[] }) {
  return (
    <section>
      <h3 className="border-t border-[#857354] px-4 pb-2 pt-3 font-display text-lg font-medium italic tracking-[.05em]">
        Checklistor
      </h3>
      {checklists.length === 0 ? (
        <PanelMessage>Inga checklistor är registrerade för platsen.</PanelMessage>
      ) : (
        <ol className="divide-y divide-[#b9a779]/60 px-4 py-3 font-display text-base italic leading-6">
          {checklists.map((checklist, index) => (
            <li key={checklist.id} className="py-2 first:pt-0 last:pb-0">
              <Link href={`/checklistor/${checklist.id}`} className="hover:text-accent">
                {String(index + 1).padStart(2, "0")} · {checklist.name}
                <span className="text-sm text-text-muted">, {checklist.species_count ?? checklist.item_count ?? 0} arter</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function PanelMessage({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-text-muted">{children}</p>
}

function legendLabel(index: number) {
  let value = index
  let label = ""

  do {
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26) - 1
  } while (value >= 0)

  return label
}
