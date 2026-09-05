"use client"

import { useRef, useState } from "react"
import { loadChecklistRegisterPage } from "@/app/tempus/_actions/checklists"
import { loadSpeciesDetail, type SpeciesDetail } from "@/app/tempus/_actions/species"
import type { TempusChecklistRegisterRow, TempusSpecies } from "@/app/lib/dal"
import QuickObservation from "@/app/tempus/observationer/quick-observation"
import { ChecklistSearchHeader } from "./checklist-search-header"
import { ChecklistRowList } from "./checklist-row-list"
import { SpeciesDetailDialog } from "./species-detail-dialog"

export type RegisterRow = {
  id: string
  sequence: number
  species: string
  notes: string
  commonName: string
  scientificName: string | null
  taxonId: string | number | null
  isObserved: boolean
  observationId?: string
  speciesDetails: TempusSpecies | null
  checklistNames: string[]
}

export default function ChecklistRegister({
  rows,
  checklistId,
  checklistName,
  initialQuery = "",
  initialPage = 1,
  initialCount,
  initialHasPrevious = false,
  initialHasNext = false,
}: {
  rows: RegisterRow[]
  checklistId: string
  checklistName: string
  initialQuery?: string
  initialPage?: number
  initialCount: number
  initialHasPrevious?: boolean
  initialHasNext?: boolean
}) {
  const requestSequence = useRef(0)
  const lastQuery = useRef(initialQuery)
  const [visibleRows, setVisibleRows] = useState(rows)
  const [resultPage, setResultPage] = useState(initialPage)
  const [resultCount, setResultCount] = useState(initialCount)
  const [hasPrevious, setHasPrevious] = useState(initialHasPrevious)
  const [hasNext, setHasNext] = useState(initialHasNext)
  const [searchLoading, setSearchLoading] = useState(false)
  const [preset, setPreset] = useState<{ id: string; label: string; scientific: string; checklistItemId: string } | null>(
    null,
  )
  const [selectedRow, setSelectedRow] = useState<RegisterRow | null>(null)
  const [selectedData, setSelectedData] = useState<SpeciesDetail | null>(null)
  const [loadingCard, setLoadingCard] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)

  const mapRows = (items: TempusChecklistRegisterRow[]): RegisterRow[] =>
    items.map((row) => ({
      id: row.id,
      sequence: row.sequence,
      species: row.species_id,
      notes: row.notes || "",
      commonName: row.swedish_name || row.scientific_name || "Okänd art",
      scientificName: row.scientific_name || null,
      taxonId: row.dyntaxa_taxon_id,
      isObserved: row.is_observed,
      observationId: row.latest_observation_id ?? undefined,
      speciesDetails: null,
      checklistNames: [checklistName],
    }))

  const loadPage = async (page: number, search: string) => {
    const requestId = ++requestSequence.current
    setSearchLoading(true)
    try {
      const result = await loadChecklistRegisterPage({ checklistId, page, search })
      if (requestId !== requestSequence.current) return
      setVisibleRows(mapRows(result.results))
      setResultPage(page)
      setResultCount(result.count)
      setHasPrevious(Boolean(result.previous))
      setHasNext(Boolean(result.next))

      const next = new URLSearchParams()
      if (search) next.set("search", search)
      if (page > 1) next.set("page", String(page))
      const queryString = next.toString()
      window.history.replaceState(null, "", queryString ? `?${queryString}` : window.location.pathname)
    } finally {
      if (requestId === requestSequence.current) setSearchLoading(false)
    }
  }

  const handleSearch = (search: string) => {
    lastQuery.current = search
    void loadPage(1, search)
  }

  const closeDialog = () => {
    setSelectedRow(null)
    setSelectedData(null)
    setCardError(null)
  }

  const selectRow = (row: RegisterRow) => {
    setSelectedRow(row)
    setSelectedData(null)
    setCardError(null)
    setLoadingCard(true)
    void loadSpeciesDetail(row.species, row.observationId)
      .then((detail) => {
        if (!detail) throw new Error("Kunde inte hämta arten.")
        setSelectedData(detail)
      })
      .catch(() => setCardError("Kunde inte hämta uppgifterna. Försök igen."))
      .finally(() => setLoadingCard(false))
  }

  const checkRow = (row: RegisterRow) => {
    if (!row.species) return
    setPreset({
      id: row.species,
      label: row.commonName,
      scientific: row.scientificName ?? "",
      checklistItemId: row.id,
    })
  }

  return (
    <>
      <ChecklistSearchHeader initialQuery={initialQuery} onSearch={handleSearch} />

      <ChecklistRowList
        rows={visibleRows}
        searchLoading={searchLoading}
        resultPage={resultPage}
        resultCount={resultCount}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onSelectRow={selectRow}
        onCheckRow={checkRow}
        onChangePage={(page) => void loadPage(page, lastQuery.current)}
      />

      {selectedRow ? (
        <SpeciesDetailDialog
          row={selectedRow}
          data={selectedData}
          loading={loadingCard}
          error={cardError}
          onClose={closeDialog}
        />
      ) : null}

      <QuickObservation
        hideTrigger
        species={preset}
        checklistItem={preset ? { id: preset.checklistItemId, checklistId, name: checklistName } : null}
        onConsumed={() => setPreset(null)}
        onSaved={(checklistItemIds, observationId) => {
          setVisibleRows((current) => current.map((row) =>
            checklistItemIds.includes(row.id)
              ? { ...row, isObserved: true, observationId: observationId ?? row.observationId }
              : row,
          ))
        }}
      />
    </>
  )
}
