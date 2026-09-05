"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { createChecklist, updateChecklist } from "@/app/tempus/_actions/checklists"
import { loadSpeciesItems } from "@/app/tempus/_actions/species"
import {
  speciesName,
  useTempusGeoAreas,
} from "@/app/tempus/_state/tempus-context"
import type { TempusSpecies, TempusSpeciesCategory } from "@/app/lib/dal"
import { SpeciesSelector } from "./checklist-builder/species-selector"

export type ChecklistBuilderData = {
  id: string
  name: string
  description: string
  auto_add: boolean
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
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState(checklist?.name ?? "")
  const [description, setDescription] = useState(checklist?.description ?? "")
  const [autoAdd, setAutoAdd] = useState(checklist?.auto_add ?? false)
  const [geoAreaId, setGeoAreaId] = useState(checklist?.geo_area ?? "")
  const [startDate, setStartDate] = useState(checklist?.start_date ?? "")
  const [endDate, setEndDate] = useState(checklist?.end_date ?? "")
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set(checklist?.species ?? []))
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedPage, setSelectedPage] = useState(1)
  const [knownSpecies, setKnownSpecies] = useState<Map<string, TempusSpecies>>(() => new Map())
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const selectedCategory = categories.find((item) => selectedCategoryIds.includes(item.id)) ?? null
  const selectedSpeciesCount = selectedCategory
    ? Math.max(selected.size, selectedCategory.species_count)
    : selected.size

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

  const toggleVisible = (visibleSpecies: TempusSpecies[], allVisibleSelected: boolean) => {
    setSelected((current) => {
      const next = new Set(current)
      visibleSpecies.forEach((item) => {
        if (allVisibleSelected) next.delete(item.id)
        else next.add(item.id)
      })
      return next
    })
  }

  const selectAllInCategory = (category: TempusSpeciesCategory) => {
    setSelectedCategoryIds([category.id])
    setSavedMessage(`Alla arter i ${category.label} läggs till när checklistan skapas.`)
    setError(null)
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
        auto_add: autoAdd,
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
              <label className="flex items-center gap-2 font-display text-[11px] italic text-text-faint sm:col-span-2">
                <input
                  type="checkbox"
                  checked={autoAdd}
                  onChange={(event) => setAutoAdd(event.target.checked)}
                  className="size-4 accent-[var(--accent)]"
                />
                Lägg till arter automatiskt
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

          <SpeciesSelector
            categories={categories}
            query={query}
            onQueryChange={setQuery}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            selected={selected}
            onToggleSpecies={toggleSpecies}
            onToggleVisible={toggleVisible}
            onSelectAllInCategory={selectAllInCategory}
            onCsvMatched={(matchedIds) => setSelected((current) => new Set([...current, ...matchedIds]))}
            messages={{
              onError: setError,
              onClearMessages: () => {
                setError(null)
                setSavedMessage(null)
              },
            }}
          />

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
