"use client"

import { useDeferredValue, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { CurrentLocationButton } from "@/app/components/ui/CurrentLocationButton"
import { Icon } from "@/app/components/ui/Icon"
import { createObservationsBatch } from "@/app/actions/tempus"
import { speciesName } from "@/app/lib/tempus-context"
import type { TempusSpecies } from "@/app/lib/dal"
import { BiotopeMap, biotopePropsFromSpecies } from "@/app/tempus/ui/biotope-map/BiotopeMap"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"

type Row = {
  key: string
  speciesId: string
  count: string
  notes: string
}

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
  const [rows, setRows] = useState<Row[]>([])
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

  const updateRow = (key: string, patch: Partial<Row>) =>
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

    const parseCoord = (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return null
      return Number(trimmed.replace(",", "."))
    }
    const latNum = parseCoord(lat)
    const lonNum = parseCoord(lon)
    if ((latNum === null) !== (lonNum === null)) {
      setError("Ange både latitud och longitud, eller ingen.")
      return
    }
    if (
      (latNum !== null && (!Number.isFinite(latNum) || Math.abs(latNum) > 90)) ||
      (lonNum !== null && (!Number.isFinite(lonNum) || Math.abs(lonNum) > 180))
    ) {
      setError("Ogiltig koordinat.")
      return
    }
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
          <header className="px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
            <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
              <span>Observationsförteckning</span>
              <span>Ny införsel</span>
            </div>

            <div className="grid border-b border-border sm:grid-cols-[minmax(0,1fr)_15rem]">
              <div className="flex min-h-24 flex-col items-center justify-center px-3 py-3 text-center sm:py-4">
                <h1 className="font-display text-2xl font-medium italic tracking-wide sm:text-3xl">Ny observation</h1>
                <p className="mt-1 font-display text-xs italic leading-5 text-text-muted">
                  Sök upp en eller flera arter och för in dem i samma fältprotokoll.
                </p>
              </div>
              <div className="relative min-h-24 overflow-hidden border-t border-border bg-surface-2/25 sm:border-l sm:border-t-0">
                <BiotopeMap
                  {...(mapSpecies ? biotopePropsFromSpecies(mapSpecies) : { seed: "Ny observation" })}
                  detail={7}
                  relief={6}
                  waterStrength={4}
                  featureAmount={3}
                  compass
                  preserveAspectRatio="xMidYMid slice"
                  className="absolute inset-0 h-full w-full opacity-45"
                  style={{ width: "100%", height: "100%" }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-surface/75 via-transparent to-transparent" />
                <span className="absolute bottom-1.5 left-2 font-display text-[9px] italic text-text-muted">
                  Biotopskiss{mapSpecies ? ` · ${mapSpecies.scientific_name}` : ""}
                </span>
              </div>
            </div>
          </header>

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

            <div className="relative border-x border-b border-border px-3 py-2 font-display text-[9px] italic text-text-faint">
              Art att föra in
              <span className="relative mt-1 block">
                <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Sök svenskt eller vetenskapligt namn"
                  className="h-9 w-full rounded border border-field-border bg-surface pl-8 pr-3 font-body text-xs not-italic text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </span>
              {deferredQuery.trim().length >= 2 ? (
                <ul className="absolute inset-x-3 top-full z-10 mt-1 overflow-hidden rounded border border-border bg-surface shadow-md">
                  {matches.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => addRow(item)}
                        className="block w-full border-b border-border px-3 py-2 text-left font-display text-xs font-normal italic last:border-b-0 hover:bg-accent-wash hover:text-accent"
                      >
                        <span>{speciesName(item)}</span>
                        <span className="ml-2 text-[10px] text-text-muted">{item.scientific_name}</span>
                      </button>
                    </li>
                  ))}
                  {speciesLoading ? <li className="px-3 py-2 text-xs text-text-muted">Hämtar arter…</li> : null}
                  {!speciesLoading && matches.length === 0 ? <li className="px-3 py-2 text-xs text-text-muted">Inga arter matchar.</li> : null}
                  {speciesTotalPages > 1 ? (
                    <li className="flex items-center justify-between border-t border-border px-2 py-1.5 text-xs text-text-muted">
                      <button type="button" disabled={speciesPage === 1} onClick={() => setSpeciesPage(speciesPage - 1)} className="disabled:text-text-faint">Föregående</button>
                      <span>{speciesPage} / {speciesTotalPages}</span>
                      <button type="button" disabled={speciesPage === speciesTotalPages} onClick={() => setSpeciesPage(speciesPage + 1)} className="disabled:text-text-faint">Nästa</button>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </section>

          <section className="px-3 pb-3 sm:px-5 sm:pb-5">
            <div className="hidden grid-cols-[2.25rem_minmax(12rem,1.5fr)_6rem_minmax(10rem,1fr)_2.5rem] border-l border-t border-border font-display text-[9px] italic text-text-muted sm:grid">
              <span className="border-b border-r border-border px-2 py-1.5 text-center">Nr</span>
              <span className="border-b border-r border-border px-3 py-1.5">Artens namn</span>
              <span className="border-b border-r border-border px-2 py-1.5 text-center">Antal</span>
              <span className="border-b border-r border-border px-3 py-1.5">Anteckning</span>
              <span className="border-b border-r border-border" />
            </div>

            {rows.length > 0 ? (
              <ol className="border-l border-t border-border sm:border-t-0">
                {rows.map((row, index) => {
                  const match = selectedSpecies.get(row.speciesId)
                  return (
                    <li key={row.key} className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] border-b border-border font-display sm:grid-cols-[2.25rem_minmax(12rem,1.5fr)_6rem_minmax(10rem,1fr)_2.5rem]">
                      <span className="row-span-3 flex justify-end border-r border-border px-2 py-2 text-[10px] italic text-text-faint sm:row-span-1">
                        {index + 1}
                      </span>
                      <span className="min-w-0 border-r border-border px-3 py-1.5">
                        <span className="block truncate text-sm italic">{match ? speciesName(match) : "Okänd art"}</span>
                        {match ? <span className="block truncate text-[10px] italic text-text-muted">{match.scientific_name}</span> : null}
                      </span>
                      <input
                        inputMode="numeric"
                        value={row.count}
                        onChange={(event) => updateRow(row.key, { count: event.target.value })}
                        placeholder="Antal"
                        aria-label={`Antal för ${match ? speciesName(match) : "art"}`}
                        className="col-start-2 row-start-2 h-8 min-w-0 border-r border-t border-border bg-transparent px-3 text-xs text-text placeholder:text-text-faint focus:bg-surface-2 focus:outline-none sm:col-start-3 sm:row-start-1 sm:h-auto sm:border-t-0 sm:text-center"
                      />
                      <input
                        value={row.notes}
                        onChange={(event) => updateRow(row.key, { notes: event.target.value })}
                        placeholder="Anteckning (valfritt)"
                        aria-label={`Anteckning för ${match ? speciesName(match) : "art"}`}
                        className="col-start-2 row-start-3 h-8 min-w-0 border-r border-t border-border bg-transparent px-3 text-xs italic text-text placeholder:text-text-faint focus:bg-surface-2 focus:outline-none sm:col-start-4 sm:row-start-1 sm:h-auto sm:border-t-0"
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        aria-label="Ta bort art"
                        className="col-start-3 row-span-3 row-start-1 flex items-center justify-center border-r border-border text-text-faint hover:bg-danger-wash hover:text-danger sm:col-start-5 sm:row-span-1"
                      >
                        <Icon name="x" size={14} />
                      </button>
                      {rowErrors[row.key] ? (
                        <p className="col-start-2 col-end-4 border-r border-t border-border px-3 py-1 text-[10px] text-danger sm:col-start-2 sm:col-end-6">
                          {rowErrors[row.key]}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <div className="border-l border-t border-border" aria-label="Inga arter tillagda än">
                {[1, 2, 3].map((line) => (
                  <div key={line} className="grid h-10 grid-cols-[2.25rem_minmax(0,1fr)_6rem_minmax(10rem,1fr)_2.5rem] border-b border-border">
                    <span className="border-r border-border" />
                    <span className="border-r border-border" />
                    <span className="border-r border-border" />
                    <span className="border-r border-border" />
                    <span className="border-r border-border" />
                  </div>
                ))}
              </div>
            )}
          </section>
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
