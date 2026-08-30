"use client"

import { useEffect, useState } from "react"
import { loadSpeciesPage } from "@/app/actions/tempus"
import type { TempusPage, TempusSpecies } from "@/app/lib/dal"

const EMPTY_PAGE: TempusPage<TempusSpecies> = {
  results: [],
  count: 0,
  next: null,
  previous: null,
  pageSize: 25,
}

export function useSpeciesPage({
  search = "",
  categoryTaxonId = null,
  pageSize = 25,
  enabled = true,
}: {
  search?: string
  categoryTaxonId?: number | null
  pageSize?: number
  enabled?: boolean
} = {}) {
  const pageKey = `${search}\u0000${categoryTaxonId ?? ""}`
  const [pagination, setPagination] = useState({ key: pageKey, page: 1 })
  const page = pagination.key === pageKey ? pagination.page : 1
  const setPage = (nextPage: number) => setPagination({ key: pageKey, page: nextPage })
  const requestKey = `${pageKey}\u0000${page}\u0000${pageSize}`
  const [request, setRequest] = useState<{
    key: string
    data: TempusPage<TempusSpecies>
    error: string | null
  }>({ key: "", data: EMPTY_PAGE, error: null })

  useEffect(() => {
    let active = true
    if (!enabled) {
      return () => { active = false }
    }

    loadSpeciesPage({ page, pageSize, search, categoryTaxonId })
      .then((result) => {
        if (active) setRequest({ key: requestKey, data: result, error: null })
      })
      .catch(() => {
        if (active) {
          setRequest({
            key: requestKey,
            data: { ...EMPTY_PAGE, pageSize },
            error: "Arterna kunde inte hämtas.",
          })
        }
      })

    return () => { active = false }
  }, [categoryTaxonId, enabled, page, pageSize, requestKey, search])

  const hasCurrentRequest = request.key === requestKey
  const currentData = enabled && hasCurrentRequest
    ? request.data
    : { ...EMPTY_PAGE, pageSize }
  const effectivePageSize = currentData.pageSize ?? pageSize
  return {
    ...currentData,
    page,
    setPage,
    totalPages: Math.max(1, Math.ceil(currentData.count / effectivePageSize)),
    loading: enabled && !hasCurrentRequest,
    error: enabled && hasCurrentRequest ? request.error : null,
  }
}
