"use client"

import { useMemo, useState } from "react"
import type { TempusChecklist, TempusLocale, TempusObservationCategory, TempusPage } from "@/app/lib/dal"
import { LocaleAtlasMap, type AtlasPoint } from "@/app/tempus/ui/atlas-map/LocaleAtlasMap"
import { LOCALE_ATLAS_PAGE_SIZE } from "./locale-atlas-config"
import { LocaleAtlasPanel } from "./locale-atlas-panel"
import { LocaleAtlasTitle } from "./locale-atlas-title"
import { useLocaleAtlasObservations } from "./use-locale-atlas-observations"

type LocaleAtlasProps = {
  locale: TempusLocale
  checklistsPage: TempusPage<TempusChecklist>
  observationPage: number
}

export function LocaleAtlas({
  locale,
  checklistsPage,
  observationPage,
}: LocaleAtlasProps) {
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null)
  const [activeObservationPage, setActiveObservationPage] = useState(observationPage)
  const [observationsOpen, setObservationsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<TempusObservationCategory | null>(null)
  const [activeCategoryLabel, setActiveCategoryLabel] = useState("")

  const {
    categoryPage,
    categoryPageNumber,
    setCategoryPageNumber,
    categoryObservationsPage,
  } = useLocaleAtlasObservations({
    localeId: locale.id,
    activeCategory,
    activeObservationPage,
    observationsOpen,
  })

  const points = useMemo<AtlasPoint[]>(
    () => (categoryObservationsPage?.results ?? []).flatMap((observation, index) => {
      if (!("coordinates" in observation.location)) return []

      const observationNumber = (activeObservationPage - 1) * LOCALE_ATLAS_PAGE_SIZE.observations + index + 1
      return [{
        id: observation.id,
        coordinates: observation.location.coordinates,
        label: activeCategoryLabel
          ? `${activeCategoryLabel}.${observationNumber}`
          : observation.species_detail.swedish_name || "Okänd art",
      }]
    }),
    [activeCategoryLabel, activeObservationPage, categoryObservationsPage],
  )
  const selectedPoint = useMemo(
    () => points.find((point) => point.id === selectedObservationId) ?? null,
    [points, selectedObservationId],
  )

  const selectCategory = (category: TempusObservationCategory, label: string) => {
    setSelectedObservationId(null)
    setActiveCategory(category)
    setActiveCategoryLabel(label)
    setActiveObservationPage(1)
    setObservationsOpen(true)
  }

  const closeObservations = () => {
    setSelectedObservationId(null)
    setObservationsOpen(false)
  }

  const changeObservationPage = (page: number) => {
    setSelectedObservationId(null)
    setActiveObservationPage(page)
  }

  return (
    <article className="mt-8 bg-surface text-[#342b20]">
      <div className="border border-[#3c3023]">
        <section aria-label="Karta över platsen">
          <LocaleAtlasTitle name={locale.name} />

          <div className="md:grid md:grid-cols-[minmax(0,1fr)_14rem] md:items-start">
            <div className="relative h-[72svh] min-h-128 border border-[#857354] bg-surface p-1 sm:h-[min(64rem,82svh)] sm:min-h-168">
              <LocaleAtlasMap
                key={locale.id}
                locale={locale}
                points={points}
                selectedPoint={selectedPoint}
                onPointClick={(point) => {
                  setSelectedObservationId(String(point.id))
                  setObservationsOpen(true)
                }}
              />
            </div>

            <LocaleAtlasPanel
              checklistsPage={checklistsPage}
              categoryPage={categoryPage}
              categoryPageNumber={categoryPageNumber}
              onCategoryPageChange={setCategoryPageNumber}
              activeCategory={activeCategory}
              activeCategoryLabel={activeCategoryLabel}
              observationsOpen={observationsOpen}
              onCategorySelect={selectCategory}
              onCloseObservations={closeObservations}
              observationsPage={categoryObservationsPage}
              activeObservationPage={activeObservationPage}
              onObservationPageChange={changeObservationPage}
              selectedObservationId={selectedObservationId}
              onObservationSelect={setSelectedObservationId}
            />
          </div>
        </section>
      </div>
    </article>
  )
}
