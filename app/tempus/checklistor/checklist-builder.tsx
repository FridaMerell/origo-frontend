"use client"

import { useDeferredValue, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { Card } from "@/app/components/ui/Card"
import { Icon } from "@/app/components/ui/Icon"
import { createChecklist, updateChecklist } from "@/app/actions/tempus"
import {
  speciesName,
  useTempusGeoAreas,
  useTempusSpecies,
  useTempusSpeciesCategories,
} from "@/app/lib/tempus-context"

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

export default function ChecklistBuilder({ checklist }: { checklist?: ChecklistBuilderData }) {
  const isEdit = Boolean(checklist)
  const species = useTempusSpecies()
  const categories = useTempusSpeciesCategories()
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
  const [categoryId, setCategoryId] = useState("all")
  const [selected, setSelected] = useState<Set<string>>(new Set(checklist?.species ?? []))
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)

  const visibleSpecies = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery)
    const category = categories.find((item) => item.id === categoryId)
    const categorySpecies = category ? new Set(category.species) : null

    return species.filter((item) => {
      if (categorySpecies && !categorySpecies.has(item.id)) return false
      if (!normalizedQuery) return true
      return (
        normalize(item.swedish_name).includes(normalizedQuery) ||
        normalize(item.scientific_name).includes(normalizedQuery) ||
        String(item.dyntaxa_taxon_id).includes(normalizedQuery)
      )
    })
  }, [categories, categoryId, deferredQuery, species])

  const selectedSpecies = useMemo(
    () => species.filter((item) => selected.has(item.id)),
    [selected, species],
  )

  const allVisibleSelected =
    visibleSpecies.length > 0 && visibleSpecies.every((item) => selected.has(item.id))

  const toggleSpecies = (id: string) => {
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

      const speciesByName = new Map<string, string>()
      const speciesByTaxonId = new Map<string, string>()
      species.forEach((item) => {
        if (item.swedish_name) speciesByName.set(normalize(item.swedish_name), item.id)
        speciesByName.set(normalize(item.scientific_name), item.id)
        speciesByTaxonId.set(String(item.dyntaxa_taxon_id), item.id)
      })

      const matchedIds = new Set<string>()
      const unmatched: string[] = []
      rows.forEach((row) => {
        const cells = cellsIn(row, delimiter)
        const values = indexes.map((index) => cells[index]?.trim()).filter(Boolean)
        const matchedId = values
          .map((value) => speciesByTaxonId.get(value) ?? speciesByName.get(normalize(value)))
          .find(Boolean)
        if (matchedId) matchedIds.add(matchedId)
        else if (values[0]) unmatched.push(values[0])
      })

      setSelected((current) => new Set([...current, ...matchedIds]))
      setImportResult({ fileName: file.name, matched: matchedIds.size, unmatched })
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
    if (selected.size === 0) {
      setError("Välj minst en art.")
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
    <div className="container mx-auto flex flex-col gap-6 py-6 max-sm:px-4 sm:py-10">
      <header className="flex flex-col gap-2 border-b border-border pb-5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-accent">
          <Icon name="list-checks" size={14} />
          Checklistor
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {isEdit ? "Redigera checklista" : "Skapa en checklista"}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-text-muted">
          Samla arterna för ett område, en inventering eller en egen utflykt. Välj manuellt
          eller importera en befintlig artlista som CSV.
        </p>
      </header>

      <form className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" onSubmit={submit}>
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-0">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-contrast">1</span>
              <div>
                <h2 className="font-display text-xl font-semibold">Grunduppgifter</h2>
                <p className="text-xs text-text-muted">Det går att ändra allt senare.</p>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                Checklistans namn
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setSavedMessage(null)
                  }}
                  placeholder="T.ex. Vårfåglar vid Hjälstaviken"
                  className="rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                Beskrivning <span className="font-normal text-text-faint">(valfritt)</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Vad ska följas upp och varför?"
                  rows={3}
                  className="resize-y rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Område <span className="font-normal text-text-faint">(valfritt)</span>
                <select
                  value={geoAreaId}
                  onChange={(event) => setGeoAreaId(event.target.value)}
                  className="rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
                >
                  <option value="">Inget område</option>
                  {geoAreas.map((geoArea) => (
                    <option key={geoArea.id} value={geoArea.id}>{geoArea.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Startdatum <span className="font-normal text-text-faint">(valfritt)</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Slutdatum <span className="font-normal text-text-faint">(valfritt)</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
                />
              </label>
            </div>
          </Card>

          <Card className="p-0">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-contrast">2</span>
              <div>
                <h2 className="font-display text-xl font-semibold">Välj arter</h2>
                <p className="text-xs text-text-muted">Importera en CSV eller sök i artregistret.</p>
              </div>
            </div>

            <div className="border-b border-border p-5">
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
                className={`flex cursor-pointer flex-col items-center gap-2 rounded border border-dashed px-5 py-7 text-center transition-colors ${
                  dragOver
                    ? "border-accent bg-accent-wash text-accent"
                    : "border-border bg-surface-2 text-text-muted hover:border-accent hover:text-text"
                }`}
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-surface text-accent shadow-sm">
                  <Icon name={importing ? "loader" : "upload"} size={19} className={importing ? "animate-spin" : ""} />
                </span>
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
                <div className="mt-3 rounded border border-border bg-surface px-3 py-3 text-sm" aria-live="polite">
                  <div className="flex items-start gap-2">
                    <Icon name="file-check" size={16} className="mt-0.5 text-success" />
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
                </div>
              ) : null}
            </div>

            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
                <label className="relative">
                  <span className="sr-only">Sök art</span>
                  <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Sök namn eller Dyntaxa-ID"
                    className="w-full rounded border border-field-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                  />
                </label>
                <label>
                  <span className="sr-only">Filtrera taxonomi</span>
                  <select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="w-full rounded border border-field-border bg-surface px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
                  >
                    <option value="all">Alla taxonomier</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between border-b border-border pb-2 text-xs text-text-muted">
                <span>{visibleSpecies.length} arter</span>
                <button type="button" onClick={toggleVisible} disabled={visibleSpecies.length === 0} className="font-medium text-accent hover:text-accent-hover disabled:text-text-faint">
                  {allVisibleSelected ? "Avmarkera visade" : "Välj alla visade"}
                </button>
              </div>

              <div className="max-h-[26rem] overflow-y-auto" style={{ contentVisibility: "auto" }}>
                {visibleSpecies.length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">Inga arter matchar filtret.</p>
                ) : visibleSpecies.map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-1 py-3 last:border-b-0 hover:bg-accent-wash">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSpecies(item.id)} className="size-4 accent-[var(--accent)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{speciesName(item)}</span>
                      <span className="block truncate font-mono text-[11px] text-text-muted">{item.scientific_name} · {item.dyntaxa_taxon_id}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="p-0 shadow-md">
            <div className="border-b border-border px-5 py-4">
              <span className="font-mono text-[10px] uppercase tracking-[.14em] text-secondary">Sammanfattning</span>
              <h2 className="mt-1 font-display text-xl font-semibold">{name.trim() || "Namnlös checklista"}</h2>
              {geoAreaId ? <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted"><Icon name="map-pin" size={13} />{geoAreas.find((geoArea) => geoArea.id === geoAreaId)?.name}</p> : null}
            </div>
            <div className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <strong className="font-display text-4xl font-semibold text-accent">{selected.size}</strong>
                  <span className="ml-2 text-sm text-text-muted">valda arter</span>
                </div>
                {selected.size > 0 ? <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-text-muted hover:text-danger">Rensa</button> : null}
              </div>

              {selectedSpecies.length > 0 ? (
                <ul className="mt-4 max-h-44 space-y-1.5 overflow-y-auto border-y border-border py-3">
                  {selectedSpecies.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{speciesName(item)}</span>
                      <button type="button" onClick={() => toggleSpecies(item.id)} aria-label={`Ta bort ${speciesName(item)}`} className="shrink-0 text-text-faint hover:text-danger"><Icon name="x" size={13} /></button>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-4 rounded bg-surface-2 px-3 py-4 text-center text-xs text-text-muted">Valda arter visas här.</p>}

              {error ? <p className="mt-4 rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
              {savedMessage ? <p className="mt-4 rounded bg-secondary-wash px-3 py-2 text-sm text-text" role="status">{savedMessage}</p> : null}

              <Button type="submit" className="mt-5 w-full justify-center" disabled={pending || !name.trim() || selected.size === 0}>
                <Icon name={pending ? "loader" : "check"} size={16} className={pending ? "animate-spin" : ""} />
                {pending
                  ? isEdit ? "Sparar…" : "Skapar…"
                  : isEdit ? "Spara ändringar" : "Skapa checklista"}
              </Button>
            </div>
          </Card>
        </aside>
      </form>
    </div>
  )
}
