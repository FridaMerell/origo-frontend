"use client"

import { useEffect, useState } from "react"
import type {
  TempusCategoryObservationsPage,
  TempusObservationCategory,
  TempusObservationCategoryPage,
} from "@/app/lib/dal"
import {
  loadLocaleCategoryObservations,
  loadLocaleObservationCategories,
} from "@/app/tempus/_actions/observations"
import { LOCALE_ATLAS_PAGE_SIZE } from "./locale-atlas-config"

const emptyCategoryPage: TempusObservationCategoryPage = {
  results: [],
  count: 0,
  next: null,
  previous: null,
  pageSize: LOCALE_ATLAS_PAGE_SIZE.categories,
}

function emptyObservationsPage(
  category: TempusObservationCategory,
): TempusCategoryObservationsPage {
  return {
    results: [],
    count: 0,
    next: null,
    previous: null,
    category,
    obs_count: 0,
    pageSize: LOCALE_ATLAS_PAGE_SIZE.observations,
  }
}

type UseLocaleAtlasObservationsOptions = {
  localeId: number
  activeCategory: TempusObservationCategory | null
  activeObservationPage: number
  observationsOpen: boolean
}

type LoadedPage<T> = {
  requestKey: string
  page: T
}

export function useLocaleAtlasObservations({
  localeId,
  activeCategory,
  activeObservationPage,
  observationsOpen,
}: UseLocaleAtlasObservationsOptions) {
  const [categoryPageNumber, setCategoryPageNumber] = useState(1)
  const [loadedCategoryPage, setLoadedCategoryPage] = useState<LoadedPage<TempusObservationCategoryPage> | null>(null)
  const [loadedObservationsPage, setLoadedObservationsPage] = useState<LoadedPage<TempusCategoryObservationsPage> | null>(null)
  const categoryRequestKey = `${localeId}:${categoryPageNumber}`
  const observationsRequestKey = activeCategory
    ? `${localeId}:${activeCategory.id}:${activeObservationPage}`
    : null

  useEffect(() => {
    const controller = new AbortController()

    void loadLocaleObservationCategories(localeId, categoryPageNumber, LOCALE_ATLAS_PAGE_SIZE.categories)
      .then((page) => {
        if (!controller.signal.aborted) {
          setLoadedCategoryPage({ requestKey: categoryRequestKey, page })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadedCategoryPage({ requestKey: categoryRequestKey, page: emptyCategoryPage })
        }
      })

    return () => controller.abort()
  }, [categoryPageNumber, categoryRequestKey, localeId])

  useEffect(() => {
    if (!observationsOpen || !activeCategory || !observationsRequestKey) return

    const controller = new AbortController()

    void loadLocaleCategoryObservations(
      localeId,
      activeCategory.id,
      activeObservationPage,
      LOCALE_ATLAS_PAGE_SIZE.observations,
    )
      .then((page) => {
        if (!controller.signal.aborted) {
          setLoadedObservationsPage({ requestKey: observationsRequestKey, page })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadedObservationsPage({
            requestKey: observationsRequestKey,
            page: emptyObservationsPage(activeCategory),
          })
        }
      })

    return () => controller.abort()
  }, [activeCategory, activeObservationPage, localeId, observationsOpen, observationsRequestKey])

  const categoryPage = loadedCategoryPage?.requestKey === categoryRequestKey
    ? loadedCategoryPage.page
    : null
  const categoryObservationsPage = observationsOpen
    && observationsRequestKey
    && loadedObservationsPage?.requestKey === observationsRequestKey
    ? loadedObservationsPage.page
    : null

  return {
    categoryPage,
    categoryPageNumber,
    setCategoryPageNumber,
    categoryObservationsPage,
  }
}
