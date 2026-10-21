"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import type {
  TempusCategoryObservationsPage,
  TempusChecklist,
  TempusObservationCategory,
  TempusObservationCategoryPage,
  TempusPage,
  TempusPublicObservation,
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

// Kartans marginal, som texten bredvid kartan i en geometrisk jordebok. Allt i
// den — kategorier, observationer, checklistor — skrivs i samma linjerade
// uppställning: littera, text och tal i var sin kolumn (ExplicatioRow), under
// samma centrerade rubrik (ExplicatioHeading).
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
    <aside className="border-t border-[#857354] lg:border-l lg:border-t-0">
      <section aria-label="Notarum Explicatio">
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
      <ExplicatioHeading>Notarum Explicatio</ExplicatioHeading>

      {categoryPage === null ? (
        <PanelMessage>Hämtar observationer…</PanelMessage>
      ) : categories.length === 0 ? (
        <PanelMessage>Inga observationskategorier är registrerade för platsen.</PanelMessage>
      ) : (
        <nav aria-label="Välj observationskategori">
          <ol>
            {categories.map(({ category, obs_count: observationCount }, index) => {
              const categoryIndex = (pageNumber - 1) * LOCALE_ATLAS_PAGE_SIZE.categories + index
              const label = legendLabel(categoryIndex)
              const isActive = category.id === activeCategory?.id

              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(category, label)}
                    aria-pressed={isActive}
                    className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    <ExplicatioRow
                      littera={`${label}.`}
                      active={isActive}
                      amount={`${observationCount} obs.`}
                    >
                      <span className={`group-hover:text-accent ${isActive ? "text-[#342b20]" : ""}`}>{category.label}</span>
                    </ExplicatioRow>
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
      <ExplicatioHeading>{title}</ExplicatioHeading>
      <button
        type="button"
        onClick={onClose}
        className="flex min-h-11 w-full items-center border-b border-[#b9a779]/60 px-4 font-display text-sm italic text-text-muted hover:text-accent"
      >
        ← Notarum Explicatio
      </button>

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
  observation: TempusPublicObservation
  label: string
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <li>
      <ExplicatioRow littera={label} active amount={observation.count ? `${observation.count} ex.` : ""}>
        <button
          type="button"
          onClick={() => onSelect(observation.id)}
          aria-pressed={selected}
          className={`text-left hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? "text-accent" : ""}`}
        >
          {observation.species_detail.swedish_name || "Okänd art"}
        </button>
        <span className="mt-0.5 block text-sm text-text-muted">
          {formatDateLongOrNull(observation.observed_at) ?? "utan datum"}
        </span>
        {selected ? (
          <span className="tempus-detail-in mt-2 block border-l border-accent pl-3 text-sm text-text-muted">
            <span className="mb-1 block">{observation.notes || "Ingen anteckning."}</span>
            <Link href={`/observationer/${observation.id}`} className="text-text underline underline-offset-4 hover:text-accent">
              Notis
            </Link>
          </span>
        ) : null}
      </ExplicatioRow>
    </li>
  )
}

function ChecklistList({ checklists }: { checklists: TempusChecklist[] }) {
  return (
    <section>
      <ExplicatioHeading>Checklistor</ExplicatioHeading>
      {checklists.length === 0 ? (
        <PanelMessage>Inga checklistor är registrerade för platsen.</PanelMessage>
      ) : (
        <ol>
          {checklists.map((checklist, index) => (
            <li key={checklist.id}>
              <Link href={`/checklistor/${checklist.id}`} className="group block">
                <ExplicatioRow
                  littera={`${index + 1}.`}
                  amount={`${checklist.species_count ?? checklist.item_count ?? 0} arter`}
                >
                  <span className="group-hover:text-accent">{checklist.name}</span>
                </ExplicatioRow>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// Rubriken står mitt i spalten mellan två linjer, som rubrikerna i en
// jordeboks textspalt.
function ExplicatioHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="break-words border-y border-[#857354] px-4 py-3.5 text-center font-display text-[1.3125rem] font-medium italic tracking-[.05em] first:border-t-0">
      {children}
    </h2>
  )
}

// En rad i marginalen: littera | text | tal, åtskilda av lodräta linjer.
function ExplicatioRow({
  littera,
  amount,
  active = false,
  children,
}: {
  littera: string
  amount: string
  active?: boolean
  children: ReactNode
}) {
  return (
    <span className="grid grid-cols-[3rem_minmax(0,1fr)_4.75rem] border-b border-[#b9a779]/60">
      <span className={`border-r border-[#b9a779]/60 px-1 pt-3 text-center font-display text-base font-bold italic ${active ? "text-[#9b4d35]" : "text-text-muted"}`}>
        {littera}
      </span>
      <span className="min-w-0 px-4 py-3 font-display text-[1.125rem] italic leading-snug">
        {children}
      </span>
      <span className="border-l border-[#b9a779]/60 px-3 pt-3.5 text-right font-display text-sm italic text-text-muted">
        {amount}
      </span>
    </span>
  )
}

function PanelMessage({ children }: { children: ReactNode }) {
  return <p className="border-b border-[#b9a779]/60 px-4 py-4 font-display text-base italic text-text-muted">{children}</p>
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
