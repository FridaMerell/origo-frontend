"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { loadChecklistRegisterPage } from "@/app/actions/tempus"
import type {
  TempusChecklistRegisterRow,
  TempusObservation,
  TempusSpecies,
} from "@/app/lib/dal"
import QuickObservation from "@/app/tempus/observationer/quick-observation"
import ObservationWidget from "@/app/tempus/observationer/observation-widget"
import SpeciesWidget from "@/app/tempus/taxa/species-widget"

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
  const [query, setQuery] = useState(initialQuery)
  const [searchOpen, setSearchOpen] = useState(Boolean(initialQuery))
  const [doubleSearchColumn, setDoubleSearchColumn] = useState<string | null>(
    initialQuery ? "Vänster spalt" : null,
  )
  const appliedQuery = useRef(initialQuery)
  const requestSequence = useRef(0)
  const [visibleRows, setVisibleRows] = useState(rows)
  const [resultPage, setResultPage] = useState(initialPage)
  const [resultCount, setResultCount] = useState(initialCount)
  const [hasPrevious, setHasPrevious] = useState(initialHasPrevious)
  const [hasNext, setHasNext] = useState(initialHasNext)
  const [searchLoading, setSearchLoading] = useState(false)
  const [preset, setPreset] = useState<{ id: string; label: string; scientific: string } | null>(
    null,
  )
  const [selectedRow, setSelectedRow] = useState<RegisterRow | null>(null)
  const [selectedData, setSelectedData] = useState<{
    species: TempusSpecies
    observation: TempusObservation | null
    speciesHref: string | null
  } | null>(null)
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

  useEffect(() => {
    const normalizedQuery = query.trim()
    if (normalizedQuery === appliedQuery.current) return

    const timer = setTimeout(() => {
      appliedQuery.current = normalizedQuery
      void loadPage(1, normalizedQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <>
      <div className="single-header grid grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] border-l border-t border-border font-display text-[10px] leading-tight text-text-muted sm:grid-cols-[2.75rem_minmax(12rem,1.75fr)_7rem_3.5rem_minmax(8rem,1fr)]">
        <span className="row-span-2 flex items-center justify-center border-b border-r border-border px-1 py-1.5 text-center text-[11px] italic">Löp.<br />nr</span>
        <div className="row-span-2 flex items-center border-b border-r border-border px-3 py-1.5 text-center italic">
          {searchOpen ? (
            <label className="flex w-full items-center gap-2 text-left">
              <span className="sr-only">Sök i checklistan</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Namn eller taxonnummer"
                ref={(element) => {
                  if (element?.offsetParent) element.focus()
                }}
                className="min-w-0 flex-1 border-0 border-b border-accent bg-transparent px-0 font-body text-xs not-italic text-text placeholder:text-text-faint focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  setSearchOpen(false)
                }}
                className="shrink-0 font-body text-[10px] not-italic text-text-muted hover:text-text"
              >
                Stäng
              </button>
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full text-center italic hover:text-text"
            >
              Artens namn och benämning
            </button>
          )}
        </div>
        <span className="hidden items-center justify-center border-b border-r border-border px-2 py-1.5 text-center text-[11px] italic sm:row-span-2 sm:flex">Dyntaxa<br />taxon-nr</span>
        <span className="col-start-3 flex items-center justify-center border-b border-r border-border px-1 py-1.5 text-center italic sm:col-start-4 sm:row-span-1">Fält</span>
        <span className="hidden items-center justify-center border-b border-r border-border px-2 py-2 text-center italic sm:row-span-2 sm:flex">Särskilda<br />anmärkningar</span>
        <span className="col-start-3 row-start-2 flex items-center justify-center border-b border-r border-border px-1 py-1 text-center text-[8px] sm:col-start-4">Avpr.</span>
      </div>

      <div className="double-header hidden grid-cols-2 border-l border-t border-border font-display text-[9px] italic leading-tight text-text-muted">
        {["Vänster spalt", "Höger spalt"].map((label) => (
          <div key={label} className="grid grid-cols-[2rem_2.5rem_minmax(0,1fr)] border-b border-border last:border-l">
            <span className="flex items-center justify-center border-r border-border px-1 py-1.5">Nr</span>
            <span className="flex items-center justify-center border-r border-border px-1 py-1.5">Avpr.</span>
            {searchOpen && doubleSearchColumn === label ? (
              <label className="flex min-w-0 items-center gap-2 px-3 py-1.5 not-italic">
                <span className="sr-only">Sök i checklistan</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Namn eller taxonnummer"
                  ref={(element) => {
                    if (element?.offsetParent) element.focus()
                  }}
                  className="min-w-0 flex-1 border-0 border-b border-accent bg-transparent px-0 font-body text-[10px] text-text placeholder:text-text-faint focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setQuery("")
                    setSearchOpen(false)
                    setDoubleSearchColumn(null)
                  }}
                  className="shrink-0 font-body text-[9px] text-text-muted hover:text-text"
                >
                  Stäng
                </button>
              </label>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true)
                  setDoubleSearchColumn(label)
                }}
                className="px-3 py-1.5 text-left italic hover:text-text"
              >
                Artens namn
              </button>
            )}
          </div>
        ))}
      </div>

      <ol className={`register-list border-l border-border ${searchLoading ? "opacity-50" : ""}`} aria-busy={searchLoading}>
        {visibleRows.map((row) => (
          <li
            key={row.id}
            className="register-row grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] border-b border-border font-display transition-colors hover:bg-surface-2/35 sm:grid-cols-[2.75rem_minmax(12rem,1.75fr)_7rem_3.5rem_minmax(8rem,1fr)]"
          >
            <span className="flex items-start justify-end border-r border-border px-2 py-2 text-xs italic tabular-nums text-text-faint">
              {row.sequence}
            </span>
            <button
              type="button"
              onClick={() => {
                if (!row.species) return
                setSelectedRow(row)
                setSelectedData(null)
                setCardError(null)
                setLoadingCard(true)
                const observationQuery = row.observationId
                  ? `?observation_id=${encodeURIComponent(row.observationId)}`
                  : ""
                fetch(`/api/tempus/species/${encodeURIComponent(row.species)}${observationQuery}`, {
                  cache: "no-store",
                })
                  .then(async (response) => {
                    if (!response.ok) throw new Error("Kunde inte hämta arten.")
                    return response.json() as Promise<{
                      species: TempusSpecies
                      observation: TempusObservation | null
                      speciesHref: string | null
                    }>
                  })
                  .then(setSelectedData)
                  .catch(() => setCardError("Kunde inte hämta uppgifterna. Försök igen."))
                  .finally(() => setLoadingCard(false))
              }}
              className="register-name min-w-0 border-r border-border px-3 py-1.5 text-left"
            >
              <span className="block truncate text-base italic tracking-wide">{row.commonName}</span>
              {row.scientificName ? (
                <span className="block truncate text-[11px] italic text-text-muted">
                  {row.scientificName}
                </span>
              ) : null}
            </button>
            <span className="register-taxon hidden items-start justify-center border-r border-border px-2 py-2 text-xs italic tabular-nums text-text-muted sm:flex">
              {row.taxonId ?? "—"}
            </span>
            <label className="register-check flex cursor-pointer items-center justify-center border-r border-border">
              <input
                type="checkbox"
                aria-label={`Bocka av ${row.commonName}`}
                aria-disabled={row.isObserved}
                defaultChecked={row.isObserved}
                className="h-4 w-4 accent-accent"
                onClick={(event) => {
                  if (row.isObserved) event.preventDefault()
                }}
                onChange={(event) => {
                  if (!event.target.checked) return
                  if (row.species) {
                    setPreset({
                      id: row.species,
                      label: row.commonName,
                      scientific: row.scientificName ?? "",
                    })
                  }
                }}
              />
            </label>
            <span className="register-notes hidden border-r border-border px-3 py-1.5 text-[11px] italic leading-4 text-text-muted sm:block">
              {row.notes || ""}
            </span>
          </li>
        ))}
      </ol>

      {hasPrevious || hasNext ? (
        <nav
          aria-label="Sidnavigering för checklistan"
          className="flex items-center justify-between border-b border-border py-3 font-display text-xs italic"
        >
          {hasPrevious ? (
            <button
              type="button"
              disabled={searchLoading}
              onClick={() => void loadPage(resultPage - 1, query.trim())}
              className="underline underline-offset-4 disabled:text-text-faint"
            >
              ← Föregående
            </button>
          ) : <span />}
          <span className="text-text-muted">{resultCount} träffar · sida {resultPage}</span>
          {hasNext ? (
            <button
              type="button"
              disabled={searchLoading}
              onClick={() => void loadPage(resultPage + 1, query.trim())}
              className="underline underline-offset-4 disabled:text-text-faint"
            >
              Nästa →
            </button>
          ) : <span />}
        </nav>
      ) : null}

      {selectedRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Uppgifter för ${selectedRow.commonName}`}
          onClick={() => {
            setSelectedRow(null)
            setSelectedData(null)
            setCardError(null)
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            {loadingCard ? (
              <div className="flex items-center justify-center gap-3 rounded-card border border-border bg-surface px-5 py-8 text-sm text-text-muted">
                <span
                  className="size-4 animate-spin rounded-full border-2 border-border border-t-accent"
                  aria-hidden="true"
                />
                <span>Hämtar uppgifter…</span>
              </div>
            ) : cardError ? (
              <div className="rounded-card border border-border bg-surface px-5 py-8 text-center text-sm text-danger">
                {cardError}
              </div>
            ) : selectedData?.observation ? (
              <ObservationWidget
                observation={selectedData.observation}
                species={selectedData.species}
                speciesHref={selectedData.speciesHref}
                checklistNames={selectedRow.checklistNames}
                actions={
                  <div className="flex items-center gap-3 font-body text-[10px] not-italic">
                    <Link
                      href={`/observationer/${selectedData.observation.id}`}
                      className="text-accent hover:text-accent-hover"
                    >
                      Öppna observation
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRow(null)
                        setSelectedData(null)
                      }}
                      className="text-text-muted hover:text-text"
                    >
                      Stäng
                    </button>
                  </div>
                }
              />
            ) : selectedData?.species ? (
              <SpeciesWidget
                species={selectedData.species}
                speciesHref={selectedData.speciesHref}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <QuickObservation hideTrigger species={preset} onConsumed={() => setPreset(null)} />
    </>
  )
}
