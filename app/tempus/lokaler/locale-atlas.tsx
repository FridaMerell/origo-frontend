"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type {
  TempusCategoryObservationsPage,
  TempusChecklist,
  TempusLocale,
  TempusObservation,
  TempusObservationCategory,
  TempusObservationCategoryPage,
  TempusPage,
} from "@/app/lib/dal"
import { formatDateLongOrNull } from "@/app/lib/formatters"
import { loadLocaleCategoryObservations, loadLocaleObservationCategories } from "@/app/tempus/_actions/observations"
import { LocaleAtlasMap, type AtlasPoint } from "@/app/tempus/ui/atlas-map/LocaleAtlasMap"
const CATEGORIES_PER_PAGE = 25
const OBSERVATIONS_PER_PAGE = 8

function observationPoint(observation: TempusObservation): AtlasPoint | null {
  if (!("coordinates" in observation.location)) return null
  return { id: observation.id, coordinates: observation.location.coordinates, label: observation.species_detail.swedish_name || "Okänd art" }
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

export function LocaleAtlas({
  locale,
  checklistsPage,
  observationPage,
  checklistPage,
}: {
  locale: TempusLocale
  checklistsPage: TempusPage<TempusChecklist>
  observationPage: number
  checklistPage: number
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeObservationPage, setActiveObservationPage] = useState(observationPage)
  const [observationsOpen, setObservationsOpen] = useState(false)
  const [categoryPageNumber, setCategoryPageNumber] = useState(1)
  const [categoryPage, setCategoryPage] = useState<TempusObservationCategoryPage | null>(null)
  const [activeCategory, setActiveCategory] = useState<TempusObservationCategory | null>(null)
  const [activeCategoryLabel, setActiveCategoryLabel] = useState("")
  const [categoryObservationsPage, setCategoryObservationsPage] = useState<TempusCategoryObservationsPage | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setCategoryPage(null)

    void loadLocaleObservationCategories(locale.id, categoryPageNumber, CATEGORIES_PER_PAGE)
      .then((page) => {
        if (!controller.signal.aborted) setCategoryPage(page)
      })
      .catch(() => {
        if (!controller.signal.aborted) setCategoryPage({ results: [], count: 0, next: null, previous: null, pageSize: CATEGORIES_PER_PAGE })
      })

    return () => controller.abort()
  }, [categoryPageNumber, locale.id])
  useEffect(() => {
    if (!observationsOpen || !activeCategory) {
      setCategoryObservationsPage(null)
      return
    }
    const controller = new AbortController()
    setCategoryObservationsPage(null)
    void loadLocaleCategoryObservations(locale.id, activeCategory.id, activeObservationPage, OBSERVATIONS_PER_PAGE)
      .then((page) => {
        if (!controller.signal.aborted) setCategoryObservationsPage(page)
      })
      .catch(() => {
        if (!controller.signal.aborted) setCategoryObservationsPage({ results: [], count: 0, next: null, previous: null, category: activeCategory, obs_count: 0, pageSize: OBSERVATIONS_PER_PAGE })
      })
    return () => controller.abort()
  }, [activeCategory, activeObservationPage, locale.id, observationsOpen])
  const categorySummaries = categoryPage?.results ?? []
  const visibleObservations = categoryObservationsPage?.results ?? []
  const points = useMemo(() => visibleObservations.flatMap((observation, index) => {
      const point = observationPoint(observation)
      const absoluteObservationIndex = (activeObservationPage - 1) * OBSERVATIONS_PER_PAGE + index + 1
      return point && activeCategoryLabel ? [{ ...point, label: `${activeCategoryLabel}.${absoluteObservationIndex}` }] : []
    }), [activeCategoryLabel, activeObservationPage, visibleObservations])
  const selectedObservationPoint = useMemo(
    () => selectedId ? points.find((point) => String(point.id) === selectedId) ?? null : null,
    [points, selectedId],
  )
  const observationPageCount = Math.max(1, Math.ceil((categoryObservationsPage?.count ?? 0) / OBSERVATIONS_PER_PAGE))
  const categoryPageCount = Math.max(1, Math.ceil((categoryPage?.count ?? 0) / CATEGORIES_PER_PAGE))

  const changeObservationPage = (page: number) => {
    setSelectedId(null)
    setActiveObservationPage(page)
  }

  return (
    <article className="mt-8 bg-surface text-[#342b20]">
      <div className="border border-[#3c3023] p-0">
        <section className="bg-surface" aria-label="Karta över platsen">
          <header className="flex items-center justify-center border-b border-[#3c3023] px-4 py-2">
            <div className="flex w-full items-center justify-center gap-5">
              <TitleArrow />
              <h2 className="mx-auto flex h-12 w-[min(62%,34rem)] items-center justify-center border border-[#3c3023] px-4 text-center font-display text-2xl font-medium italic leading-none tracking-[.08em] sm:text-3xl">{locale.name}</h2>
              <TitleArrow flipped />
            </div>
          </header>
          <div className="md:grid md:grid-cols-[minmax(0,1fr)_14rem] md:items-start md:gap-x-0">
            <div className="relative h-[72svh] min-h-128 border border-[#857354] bg-surface p-1 sm:h-[min(64rem,82svh)] sm:min-h-168">
              <div className="h-full w-full">
                <LocaleAtlasMap
                  key={locale.id}
                  locale={locale}
                  points={points}
                  onPointClick={(point) => {
                    setSelectedId(String(point.id))
                    setObservationsOpen(true)
                  }}
                  selectedPoint={selectedObservationPoint}
                />
              </div>
            </div>
            <aside className="border-y border-[#857354] px-0 py-3 md:my-0 md:border-y md:py-0">
              <section className="font-display italic leading-6" aria-label="Notarum Explicatio">
                {!observationsOpen ? <h3 className="border-b border-[#857354] px-4 pb-2 pt-3 text-left text-lg font-medium tracking-[.05em]">Notarum Explicatio</h3> : null}
                {!observationsOpen && categoryPage === null ? (
                  <p className="px-4 py-3 text-sm text-text-muted">Hämtar observationer…</p>
                ) : !observationsOpen && categorySummaries.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-text-muted">Inga observationskategorier är registrerade för platsen.</p>
                ) : (
                  <>
                    {!observationsOpen ? <nav aria-label="Välj observationskategori">
                      <ol className="border-b border-[#b9a779]/60">
                        {categorySummaries.map(({ category, obs_count: observationCount }, index) => {
                          const isActive = category.id === activeCategory?.id
                          const categoryIndex = (categoryPageNumber - 1) * CATEGORIES_PER_PAGE + index
                          return <li key={category.id} className="border-t border-[#b9a779]/60 first:border-t-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(null)
                                if (isActive) setObservationsOpen((isOpen) => !isOpen)
                                else {
                                  setActiveCategory(category)
                                  setActiveCategoryLabel(legendLabel(categoryIndex))
                                  setActiveObservationPage(1)
                                  setObservationsOpen(true)
                                }
                              }}
                              aria-pressed={isActive}
                              aria-expanded={isActive ? observationsOpen : undefined}
                              className="grid w-full grid-cols-[2rem_minmax(0,1fr)] text-left text-sm focus-visible:outline focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                            >
                              <span className={`flex min-h-11 items-start justify-center border-r border-[#b9a779]/60 pt-2 font-display font-bold italic ${isActive ? "text-[#9b4d35]" : "text-text-muted"}`}>{legendLabel(categoryIndex)}.</span>
                              <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 px-3 py-2">
                                <span className={isActive ? "font-medium text-[#342b20]" : ""}>{category.label}</span>
                                <span className="text-xs text-text-muted">{observationCount} {observationCount === 1 ? "observation" : "observationer"}</span>
                              </span>
                            </button>
                          </li>
                        })}
                      </ol>
                      {categoryPageCount > 1 ? <nav className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2 px-4 py-3 text-sm text-text-muted" aria-label="Bläddra kategorier"><span className="whitespace-nowrap font-display italic">Sida {categoryPageNumber} av {categoryPageCount}</span><span className="justify-self-center">{categoryPageNumber > 1 ? <button type="button" onClick={() => setCategoryPageNumber((page) => page - 1)} className="whitespace-nowrap font-display italic hover:text-accent">Föregående</button> : null}</span><span className="justify-self-end">{categoryPageNumber < categoryPageCount ? <button type="button" onClick={() => setCategoryPageNumber((page) => page + 1)} className="whitespace-nowrap font-display italic hover:text-accent">Nästa</button> : null}</span></nav> : null}
                    </nav> : null}
                    {observationsOpen ? <>
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 border-b border-[#857354] px-4 py-2 text-sm">
                        <button type="button" onClick={() => { setSelectedId(null); setObservationsOpen(false) }} className="font-display italic text-text-muted hover:text-accent">← Kategorier</button>
                        <span className="min-w-0 text-right font-medium">{activeCategory ? `${activeCategoryLabel}. ${activeCategory.label}` : "Observationer"}</span>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_2.85rem] border-b border-[#857354] px-4 py-1 font-display text-[0.65rem] uppercase tracking-[.08em] text-text-muted">
                        <span>Art</span>
                        <span className="text-right">Nr.</span>
                      </div>
                      {categoryObservationsPage === null ? <p className="px-4 py-3 text-sm text-text-muted">Hämtar observationer…</p> : visibleObservations.length === 0 ? <p className="px-4 py-3 text-sm text-text-muted">Inga observationer är registrerade i kategorin.</p> : <ol className="space-y-0">
                        {visibleObservations.map((observation, index) => {
                          const observationIndex = (activeObservationPage - 1) * OBSERVATIONS_PER_PAGE + index + 1
                          const isSelected = observation.id === selectedId
                          return <li key={observation.id} className="grid grid-cols-[minmax(0,1fr)_2.85rem] border-b border-[#b9a779]/60">
                            <div className="min-w-0 px-4 py-1.5">
                              <button type="button" onClick={() => setSelectedId(observation.id)} aria-pressed={isSelected} className={`min-w-0 text-left focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-accent ${isSelected ? "text-accent" : ""}`}>
                                {observation.species_detail.swedish_name || "Okänd art"}
                              </button>
                              <p className="mt-0.5 text-xs text-text-muted">{formatDateLongOrNull(observation.observed_at) ?? "utan datum"}{observation.count ? `, ${observation.count} ex` : ""}</p>
                              {isSelected ? <div className="mt-2 border-l border-accent pl-2 text-xs text-text-muted"><p className="mb-1">{observation.notes || "Ingen anteckning."}</p><Link href={`/observationer/${observation.id}`} className="text-text hover:text-accent">Notis</Link></div> : null}
                            </div>
                            <span className="flex justify-end border-l border-[#b9a779]/60 px-2 pt-2 font-display text-base font-bold italic text-[#9b4d35]">{activeCategoryLabel}.{observationIndex}</span>
                          </li>
                        })}
                      </ol>}
                      {observationPageCount > 1 ? <nav className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2 px-4 py-3 text-sm text-text-muted" aria-label="Bläddra observationer"><span className="whitespace-nowrap font-display italic">Sida {activeObservationPage} av {observationPageCount}</span><span className="justify-self-center">{activeObservationPage > 1 ? <button type="button" onClick={() => changeObservationPage(activeObservationPage - 1)} className="whitespace-nowrap font-display italic hover:text-accent">Föregående</button> : null}</span><span className="justify-self-end">{activeObservationPage < observationPageCount ? <button type="button" onClick={() => changeObservationPage(activeObservationPage + 1)} className="whitespace-nowrap font-display italic hover:text-accent">Nästa</button> : null}</span></nav> : null}
                    </> : null}
                  </>
                )}
              </section>
              {!observationsOpen ? <>
                <section className="mt-12">
                  <h3 className="border-t border-[#857354] px-4 pt-5 font-display text-base font-medium italic tracking-wide">Checklistor</h3>
                  {checklistsPage.results.length === 0 ? <p className="mt-3 px-4 font-display italic text-text-muted">Inga checklistor är registrerade för platsen.</p> : <ol className="mt-3 divide-y divide-[#b9a779]/60 px-4 font-display text-base italic leading-6">{checklistsPage.results.map((checklist, index) => <li key={checklist.id} className="py-2 first:pt-0"><Link href={`/checklistor/${checklist.id}`} className="hover:text-accent">{String(index + 1).padStart(2, "0")} · {checklist.name}<span className="text-sm text-text-muted">, {checklist.species_count ?? checklist.item_count ?? 0} arter</span></Link></li>)}</ol>}
                </section>
              </> : null}
            </aside>
          </div>
        </section>
      </div>
    </article>
  )
}

function TitleArrow({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 30" className={`hidden h-7 w-36 shrink-0 text-[#2d251d] sm:block ${flipped ? "-scale-x-100" : ""}`}>
      <path d="M4 15H136M22 15c36 0 72-2 112-7M22 15c36 0 72 2 112 7M70 15c25 0 48-1 64-4M70 15c25 0 48 1 64 4M138 2v26" fill="none" stroke="currentColor" strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 15h114l-22-3 22 3-22 3H22Z" fill="currentColor" opacity=".3" />
      <circle cx="4" cy="15" r="1.35" fill="currentColor" />
    </svg>
  )
}
