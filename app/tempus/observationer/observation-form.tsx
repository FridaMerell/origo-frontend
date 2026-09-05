"use client"

import { useDeferredValue, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { CurrentLocationButton } from "@/app/components/ui/CurrentLocationButton"
import { Icon } from "@/app/components/ui/Icon"
import { createObservationsBatch } from "@/app/tempus/_actions/observations"
import { parseLatLon } from "@/app/tempus/formatters"
import type { TempusSpecies } from "@/app/lib/dal"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"
import { ObservationFormHeader } from "./observation-form-header"
import { ObservationSpeciesSearch } from "./observation-species-search"
import { ObservationRowList, type ObservationRow } from "./observation-row-list"

let rowSeq = 0
function rowKey() {
  rowSeq += 1
  return `row-${Date.now().toString(36)}-${rowSeq}`
}

function nowLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export default function ObservationForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [observedAt, setObservedAt] = useState(nowLocal())
  const [lat, setLat] = useState("")
  const [lon, setLon] = useState("")
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState<ObservationRow[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState<Map<string, TempusSpecies>>(() => new Map())
  const [error, setError] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const deferredQuery = useDeferredValue(query)

  const stagedIds = useMemo(() => new Set(rows.map((row) => row.speciesId)), [rows])

  const {
    results: speciesResults,
    page: speciesPage,
    setPage: setSpeciesPage,
    totalPages: speciesTotalPages,
    loading: speciesLoading,
  } = useSpeciesPage({
    search: deferredQuery,
    pageSize: 8,
    enabled: deferredQuery.trim().length >= 2,
  })
  const matches = speciesResults.filter((item) => !stagedIds.has(item.id))
  const mapSpecies = rows.length > 0
    ? selectedSpecies.get(rows[0]?.speciesId)
    : undefined

  const addRow = (item: TempusSpecies) => {
    if (stagedIds.has(item.id)) return
    setRows((current) => [
      ...current,
      { key: rowKey(), speciesId: item.id, count: "1", notes: "" },
    ])
    setSelectedSpecies((current) => new Map(current).set(item.id, item))
    setQuery("")
    setError(null)
  }

  const updateRow = (key: string, patch: Partial<ObservationRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const removeRow = (key: string) =>
    setRows((current) => current.filter((row) => row.key !== key))

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setRowErrors({})
    if (rows.length === 0) {
      setError("Lägg till minst en art.")
      return
    }

    const invalid = rows.find((row) => row.count.trim() && !/^\d+$/.test(row.count.trim()))
    if (invalid) {
      setError("Antal måste vara ett heltal.")
      return
    }
    if (!observedAt) {
      setError("Ange en tidpunkt.")
      return
    }

    const parsedCoords = parseLatLon(lat, lon)
    if ("error" in parsedCoords) {
      setError(parsedCoords.error)
      return
    }
    const { lat: latNum, lon: lonNum } = parsedCoords
    const location =
      latNum !== null && lonNum !== null
        ? { type: "Point" as const, coordinates: [lonNum, latNum] as [number, number] }
        : undefined
    const observedAtIso = new Date(observedAt).toISOString()

    startTransition(async () => {
      const result = await createObservationsBatch(
        rows.map((row) => ({
          species: row.speciesId,
          checklist_items: [],
          observed_at: observedAtIso,
          ...(location ? { location } : {}),
          count: row.count.trim() ? Number(row.count.trim()) : null,
          notes: row.notes.trim(),
        })),
      )

      if (result.error) {
        setError(result.error)
        return
      }

      const failed = result.results.filter((entry) => !entry.ok)
      if (failed.length === 0) {
        router.push("/observationer")
        return
      }

      const okKeys = new Set(
        result.results.filter((entry) => entry.ok).map((entry) => rows[entry.index]?.key),
      )
      setRows((current) => current.filter((row) => !okKeys.has(row.key)))
      setRowErrors(
        Object.fromEntries(
          failed.map((entry) => [rows[entry.index]?.key ?? "", entry.error ?? "Kunde inte sparas."]),
        ),
      )
      setError(
        `${result.created} sparades, ${failed.length} misslyckades.`,
      )
    })
  }

  return (
    <div className="container mx-auto max-w-4xl py-5 max-sm:px-3 sm:py-7">
      <form className="flex flex-col gap-3" onSubmit={submit}>
        <article className="overflow-hidden rounded-card border border-border bg-surface text-text shadow-card">
          <ObservationFormHeader mapSpecies={mapSpecies} />

          <section className="px-3 pb-3 sm:px-5">
            <div className="grid border-l border-t border-border sm:grid-cols-[1fr_2fr]">
              <label className="flex flex-col border-b border-r border-border px-3 py-2 font-display text-[9px] italic text-text-faint">
                Tidpunkt
                <input
                  type="datetime-local"
                  value={observedAt}
                  max={nowLocal()}
                  onChange={(event) => setObservedAt(event.target.value)}
                  className="mt-1 h-9 rounded border border-field-border bg-surface px-2.5 font-body text-xs not-italic text-text focus:border-accent focus:outline-none"
                />
              </label>

              <fieldset className="border-b border-r border-border px-3 py-2">
                <legend className="font-display text-[9px] italic text-text-faint">Position <span>(valfritt)</span></legend>
                <div className="mt-1 flex flex-wrap items-start gap-2">
                  <input
                    inputMode="decimal"
                    value={lat}
                    onChange={(event) => setLat(event.target.value)}
                    placeholder="Latitud"
                    className="h-9 min-w-0 flex-1 basis-28 rounded border border-field-border bg-surface px-2.5 text-xs text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                  />
                  <input
                    inputMode="decimal"
                    value={lon}
                    onChange={(event) => setLon(event.target.value)}
                    placeholder="Longitud"
                    className="h-9 min-w-0 flex-1 basis-28 rounded border border-field-border bg-surface px-2.5 text-xs text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                  />
                  <CurrentLocationButton
                    size="sm"
                    className="h-9"
                    onLocate={({ latitude, longitude }) => {
                      setLat(latitude.toFixed(6))
                      setLon(longitude.toFixed(6))
                      setError(null)
                    }}
                  />
                </div>
              </fieldset>
            </div>

            <ObservationSpeciesSearch
              query={query}
              onQueryChange={setQuery}
              showResults={deferredQuery.trim().length >= 2}
              matches={matches}
              loading={speciesLoading}
              page={speciesPage}
              onPageChange={setSpeciesPage}
              totalPages={speciesTotalPages}
              onAdd={addRow}
            />
          </section>

          <ObservationRowList
            rows={rows}
            selectedSpecies={selectedSpecies}
            rowErrors={rowErrors}
            onUpdateRow={updateRow}
            onRemoveRow={removeRow}
          />
        </article>

        {error ? (
          <p className="rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="paper" disabled={pending || rows.length === 0}>
            <Icon name={pending ? "loader" : "check"} size={16} className={pending ? "animate-spin" : ""} />
            {pending
              ? "Sparar…"
              : `Spara ${rows.length || ""} ${rows.length === 1 ? "observation" : "observationer"}`.trim()}
          </Button>
          {rows.length > 0 ? (
            <button
              type="button"
              onClick={() => setRows([])}
              disabled={pending}
              className="text-sm text-text-muted hover:text-text disabled:opacity-50"
            >
              Rensa
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}
