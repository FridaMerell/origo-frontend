"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { CategoryTreeSelect } from "@/app/components/ui/CategoryTreeSelect"
import { createChecklist, loadSpeciesItems, matchSpeciesValues, updateChecklist } from "@/app/actions/tempus"
import {
  speciesName,
  useTempusGeoAreas,
} from "@/app/lib/tempus-context"
import type { TempusSpecies, TempusSpeciesCategory } from "@/app/lib/dal"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"

const MAX_CSV_BYTES = 2 * 1024 * 1024

const NAME_HEADERS = new Set([
  "art",
  "artnamn",
  "name",
  "species",
  "svenskt_namn",
  "swedish_name",
  "vetenskapligt_namn",
  "scientific_name",
])
const ID_HEADERS = new Set(["taxon_id", "dyntaxa_id", "dyntaxa_taxon_id"])

type ImportResult = {
  fileName: string
  matched: number
  unmatched: string[]
}

function normalize(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLocaleLowerCase("sv")
    .replace(/[\s-]+/g, "_")
}

function cellsIn(line: string, delimiter: string) {
  const cells: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim())
      cell = ""
    } else {
      cell += character
    }
  }

  cells.push(cell.trim())
  return cells
}

function detectDelimiter(line: string) {
  const candidates = [";", ",", "\t"]
  return candidates.reduce((best, candidate) =>
    cellsIn(line, candidate).length > cellsIn(line, best).length ? candidate : best,
  )
}

export type ChecklistBuilderData = {
  id: string
  name: string
  description: string
  start_date: string | null
  end_date: string | null
  geo_area: string | null
  species: string[]
}

export default function ChecklistBuilder({
  checklist,
  categories,
}: {
  checklist?: ChecklistBuilderData
  categories: TempusSpeciesCategory[]
}) {
  const isEdit = Boolean(checklist)
  const { geoAreas } = useTempusGeoAreas()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState(checklist?.name ?? "")
  const [description, setDescription] = useState(checklist?.description ?? "")
  const [geoAreaId, setGeoAreaId] = useState(checklist?.geo_area ?? "")
  const [startDate, setStartDate] = useState(checklist?.start_date ?? "")
  const [endDate, setEndDate] = useState(checklist?.end_date ?? "")
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set(checklist?.species ?? []))
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedPage, setSelectedPage] = useState(1)
  const [knownSpecies, setKnownSpecies] = useState<Map<string, TempusSpecies>>(() => new Map())
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)

  const activeCategory = categories.find((item) => item.id === categoryId) ?? null
  const selectedCategory = categories.find((item) => selectedCategoryIds.includes(item.id)) ?? null
  const selectedSpeciesCount = selectedCategory
    ? Math.max(selected.size, selectedCategory.species_count)
    : selected.size
  const {
    results: visibleSpecies,
    count: visibleSpeciesCount,
    page: speciesPage,
    setPage: setSpeciesPage,
    totalPages: speciesTotalPages,
    loading: speciesLoading,
    error: speciesError,
  } = useSpeciesPage({
    search: deferredQuery,
    categoryTaxonId: activeCategory?.taxon_id,
  })

  const selectedIds = useMemo(() => [...selected], [selected])
  const selectedTotalPages = Math.max(1, Math.ceil(selectedIds.length / 25))
  const effectiveSelectedPage = Math.min(selectedPage, selectedTotalPages)
  const selectedPageIds = useMemo(
    () => selectedIds.slice((effectiveSelectedPage - 1) * 25, effectiveSelectedPage * 25),
    [effectiveSelectedPage, selectedIds],
  )
  const selectedSpecies = selectedPageIds
    .map((id) => knownSpecies.get(id))
    .filter((item): item is TempusSpecies => Boolean(item))

  useEffect(() => {
    const missing = selectedPageIds.filter((id) => !knownSpecies.has(id))
    if (missing.length === 0) return
    let active = true
    loadSpeciesItems(missing).then((items) => {
      if (!active) return
      setKnownSpecies((current) => {
        const next = new Map(current)
        items.forEach((item) => next.set(item.id, item))
        return next
      })
    })
    return () => { active = false }
  }, [knownSpecies, selectedPageIds])

  const allVisibleSelected =
    visibleSpecies.length > 0 && visibleSpecies.every((item) => selected.has(item.id))

  const toggleSpecies = (id: string, item?: TempusSpecies) => {
    if (item) setKnownSpecies((current) => new Map(current).set(item.id, item))
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSavedMessage(null)
  }

  const toggleVisible = () => {
    setSelected((current) => {
      const next = new Set(current)
      visibleSpecies.forEach((item) => {
        if (allVisibleSelected) next.delete(item.id)
        else next.add(item.id)
      })
      return next
    })
  }

  const selectAllInCategory = () => {
    if (!activeCategory) return
    setSelectedCategoryIds([activeCategory.id])
    setSavedMessage(`Alla arter i ${activeCategory.label} läggs till när checklistan skapas.`)
    setError(null)
  }

  const importCsv = async (file: File) => {
    setError(null)
    setSavedMessage(null)
    setImportResult(null)

    if (!file.name.toLocaleLowerCase().endsWith(".csv")) {
      setError("Välj en CSV-fil.")
      return
    }
    if (file.size > MAX_CSV_BYTES) {
      setError("CSV-filen får vara högst 2 MB.")
      return
    }

    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((line) => line.trim())
      if (lines.length === 0) throw new Error("CSV-filen är tom.")

      const delimiter = detectDelimiter(lines[0])
      const firstRow = cellsIn(lines[0], delimiter)
      const normalizedHeaders = firstRow.map(normalize)
      const hasHeaders = normalizedHeaders.some(
        (header) => NAME_HEADERS.has(header) || ID_HEADERS.has(header),
      )
      const headers = hasHeaders ? normalizedHeaders : ["art"]
      const rows = hasHeaders ? lines.slice(1) : lines
      const candidateIndexes = headers.flatMap((header, index) =>
        NAME_HEADERS.has(header) || ID_HEADERS.has(header) ? [index] : [],
      )
      const indexes = candidateIndexes.length > 0 ? candidateIndexes : [0]

      const values = rows.flatMap((row) => {
        const cells = cellsIn(row, delimiter)
        return indexes.map((index) => cells[index]?.trim()).filter(Boolean)
      })
      const { matchedIds, unmatched } = await matchSpeciesValues(values)

      setSelected((current) => new Set([...current, ...matchedIds]))
      setImportResult({ fileName: file.name, matched: matchedIds.length, unmatched })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CSV-filen kunde inte läsas.")
    } finally {
      setImporting(false)
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSavedMessage(null)
    if (!name.trim()) {
      setError("Ge checklistan ett namn.")
      return
    }
    if (selected.size === 0 && selectedCategoryIds.length === 0) {
      setError("Välj minst en art eller kategori.")
      return
    }
    if (startDate && endDate && endDate < startDate) {
      setError("Slutdatum kan inte vara före startdatum.")
      return
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        geo_area: geoAreaId || null,
        species: [...selected],
        species_category_ids: selectedCategoryIds,
      }
      const result = checklist
        ? await updateChecklist(checklist.id, payload)
        : await createChecklist(payload)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.checklistId) {
        router.push(`/checklistor/${result.checklistId}`)
        return
      }
      setError("Checklistan kunde inte skapas.")
    })
  }

  return (
    <div className="container mx-auto flex flex-col gap-3 py-5 max-sm:px-3 sm:py-7">
      <Link
        href="/checklistor"
        className="flex w-fit items-center font-mono text-[10px] uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent"
      >
        ← Checklistor
      </Link>

      <form className="flex flex-col gap-3" onSubmit={submit}>
        <article className="rounded-card border border-border bg-surface text-text shadow-card">
          <header className="px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
            <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
              <span>Checklistförteckning</span>
              <span>{isEdit ? "Redigera checklista" : "Ny checklista"}</span>
            </div>
            <div className="border-b border-border px-3 py-4 text-center sm:py-5">
              <h1 className="font-display text-2xl font-medium italic tracking-wide sm:text-3xl">
                {isEdit ? "Redigera checklista" : "Ny checklista"}
              </h1>
            </div>
          </header>

        <div className="grid items-start gap-6 px-4 pb-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="contents">
          <section className="border-t border-border lg:col-start-1 lg:row-start-1">
            <div className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[.14em] text-secondary">01</span>
                <h2 className="mt-1 font-display text-2xl font-semibold">Grunduppgifter</h2>
              </div>
            </div>
            <div className="grid gap-5 px-4 py-5 sm:grid-cols-2 sm:px-5">
              <label className="flex flex-col gap-1.5 font-display text-[11px] italic text-text-faint sm:col-span-2">
                Checklistans namn
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setSavedMessage(null)
                  }}
                  placeholder="T.ex. Vårfåglar vid Hjälstaviken"
                  className="rounded-none border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 font-display text-[11px] italic text-text-faint sm:col-span-2">
                Beskrivning <span className="font-normal text-text-faint">(valfritt)</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="resize-y rounded-none border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 font-display text-[11px] italic text-text-faint sm:col-span-2">
                Område <span className="font-normal text-text-faint">(valfritt)</span>
                <select
                  value={geoAreaId}
                  onChange={(event) => setGeoAreaId(event.target.value)}
                  className="rounded-none border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
                >
                  <option value="">Inget område</option>
                  {geoAreas.map((geoArea) => (
                    <option key={geoArea.id} value={geoArea.id}>{geoArea.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 font-display text-[11px] italic text-text-faint">
                Startdatum <span className="font-normal text-text-faint">(valfritt)</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="rounded-none border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 font-display text-[11px] italic text-text-faint">
                Slutdatum <span className="font-normal text-text-faint">(valfritt)</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="rounded-none border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
                />
              </label>
            </div>
          </section>

          <section className="border-t border-border lg:col-start-1 lg:row-start-2">
            <div className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[.14em] text-secondary">02</span>
                <h2 className="mt-1 font-display text-2xl font-semibold">Välj arter</h2>
              </div>
            </div>

            <div className="border-b border-border px-4 py-4 sm:px-5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click()
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragOver(false)
                  const file = event.dataTransfer.files[0]
                  if (file) void importCsv(file)
                }}
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-none border border-dashed px-4 py-4 text-left transition-colors ${
                  dragOver
                    ? "border-accent bg-accent-wash text-accent"
                    : "border-border bg-surface-2 text-text-muted hover:border-accent hover:text-text"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-text">
                    {importing ? "Läser artlistan…" : "Släpp en CSV här eller välj fil"}
                  </p>
                  <p className="mt-1 text-xs">Svenskt namn, vetenskapligt namn eller Dyntaxa-ID · max 2 MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void importCsv(file)
                    event.target.value = ""
                  }}
                />
              </div>

              {importResult ? (
                <div className="mt-3 border-y border-border py-3 text-sm" aria-live="polite">
                  <div className="min-w-0">
                    <p className="font-medium"><span className="break-all">{importResult.fileName}</span> · {importResult.matched} matchade</p>
                    {importResult.unmatched.length > 0 ? (
                      <details className="mt-1 text-text-muted">
                        <summary className="cursor-pointer">{importResult.unmatched.length} kunde inte matchas</summary>
                        <p className="mt-1 break-words text-xs">{importResult.unmatched.slice(0, 12).join(", ")}{importResult.unmatched.length > 12 ? " …" : ""}</p>
                      </details>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="px-4 py-4 sm:px-5">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
                <label>
                  <span className="sr-only">Sök art</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Sök namn eller Dyntaxa-ID"
                    className="w-full rounded-none border border-field-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                  />
                </label>
                <div className="min-w-0">
                  <CategoryTreeSelect
                    categories={categories}
                    value={categoryId}
                    onChange={setCategoryId}
                    placeholder="Alla kategorier"
                    allLabel="Alla kategorier"
                    searchPlaceholder="Sök kategori eller grupp"
                  />
                </div>
              </div>

              {activeCategory ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <span className="text-xs text-text-muted">Kategori: {activeCategory.label}</span>
                  <button
                    type="button"
                    onClick={() => void selectAllInCategory()}
                    disabled={speciesLoading}
                    className="font-medium text-accent hover:text-accent-hover disabled:text-text-faint"
                  >
                    Välj alla i kategorin
                  </button>
                </div>
              ) : null}

              <div className="mt-3 flex items-center justify-between border-b border-border pb-2 text-xs text-text-muted">
                <span>{visibleSpeciesCount} arter</span>
                <button type="button" onClick={toggleVisible} disabled={visibleSpecies.length === 0} className="font-medium text-accent hover:text-accent-hover disabled:text-text-faint">
                  {allVisibleSelected ? "Avmarkera visade" : "Välj alla visade"}
                </button>
              </div>

              <div className="max-h-[26rem] overflow-y-auto" style={{ contentVisibility: "auto" }}>
                {speciesLoading ? (
                  <p className="py-8 text-center text-sm text-text-muted">Hämtar arter…</p>
                ) : visibleSpecies.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">Inga arter matchar filtret.</p>
                ) : visibleSpecies.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-1 py-3 last:border-b-0 hover:bg-accent-wash">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSpecies(item.id, item)} className="size-4 accent-[var(--accent)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{speciesName(item)}</span>
                      <span className="block truncate font-mono text-[11px] text-text-muted">{item.scientific_name} · {item.dyntaxa_taxon_id}</span>
                    </span>
                  </label>
                ))}
              </div>
              {speciesError ? <p className="border-t border-border py-2 text-sm text-danger">{speciesError}</p> : null}
              {speciesTotalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-text-muted">
                  <button type="button" disabled={speciesPage === 1 || speciesLoading} onClick={() => setSpeciesPage(speciesPage - 1)} className="font-medium text-accent disabled:text-text-faint">Föregående</button>
                  <span>Sida {speciesPage} av {speciesTotalPages}</span>
                  <button type="button" disabled={speciesPage === speciesTotalPages || speciesLoading} onClick={() => setSpeciesPage(speciesPage + 1)} className="font-medium text-accent disabled:text-text-faint">Nästa</button>
                </div>
              ) : null}
            </div>
          </section>

        <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <section className="border-t border-border">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-secondary">Sammanfattning</span>
              <h2 className="mt-1 font-display text-xl font-semibold">{name.trim() || "Namnlös checklista"}</h2>
              {geoAreaId ? <p className="mt-1 text-xs text-text-muted">{geoAreas.find((geoArea) => geoArea.id === geoAreaId)?.name}</p> : null}
            </div>
            <div className="px-4 py-4 sm:px-5">
              <div className="flex items-end justify-between">
                <div>
                  <strong className="font-display text-4xl font-semibold text-accent">{selectedSpeciesCount}</strong>
                  <span className="ml-2 text-sm text-text-muted">valda arter</span>
                </div>
                {selected.size > 0 ? <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-text-muted hover:text-danger">Rensa</button> : null}
              </div>

              {selectedSpecies.length > 0 ? (
                <ul className="mt-4 max-h-44 space-y-1.5 overflow-y-auto border-y border-border py-3">
                  {selectedSpecies.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{speciesName(item)}</span>
                      <button type="button" onClick={() => toggleSpecies(item.id)} aria-label={`Ta bort ${speciesName(item)}`} className="shrink-0 text-xs text-text-muted underline-offset-2 hover:text-danger hover:underline">Ta bort</button>
                    </li>
                  ))}
                </ul>
              ) : selectedCategory ? (
                <p className="mt-4 border-y border-border py-4 text-center text-xs text-text-muted">
                  Alla arter i {selectedCategory.label} läggs till vid skapandet.
                </p>
              ) : <p className="mt-4 border-y border-border py-4 text-center text-xs text-text-muted">Valda arter visas här.</p>}
              {selectedTotalPages > 1 ? (
                <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                  <button type="button" disabled={effectiveSelectedPage === 1} onClick={() => setSelectedPage(effectiveSelectedPage - 1)} className="text-accent disabled:text-text-faint">Föregående</button>
                  <span>{effectiveSelectedPage} / {selectedTotalPages}</span>
                  <button type="button" disabled={effectiveSelectedPage === selectedTotalPages} onClick={() => setSelectedPage(effectiveSelectedPage + 1)} className="text-accent disabled:text-text-faint">Nästa</button>
                </div>
              ) : null}

              {error ? <p className="mt-4 border-y border-danger py-2 text-sm text-danger" role="alert">{error}</p> : null}
              {savedMessage ? <p className="mt-4 border-y border-border py-2 text-sm text-text" role="status">{savedMessage}</p> : null}

              <Button type="submit" variant="paper-bordered" className="mt-5 w-full justify-center rounded-none" disabled={pending || !name.trim() || (selected.size === 0 && selectedCategoryIds.length === 0)}>
                {pending
                  ? isEdit ? "Sparar…" : "Skapar…"
                  : isEdit ? "Spara ändringar" : "Skapa checklista"}
              </Button>
            </div>
          </section>
        </aside>
        </div>
        </div>
        </article>
      </form>
    </div>
  )
}
