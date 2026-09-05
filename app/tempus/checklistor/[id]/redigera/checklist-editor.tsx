"use client"

import { useDeferredValue, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { updateChecklist } from "@/app/tempus/_actions/checklists"
import { speciesName, useTempusGeoAreas } from "@/app/tempus/_state/tempus-context"
import type { TempusSpecies } from "@/app/lib/dal"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"

export type ChecklistEditorData = {
  id: string
  name: string
  description: string
  auto_add: boolean
  start_date: string | null
  end_date: string | null
  geo_area: string | null
  species: Array<{ id: string; itemId: string; name: string; sequence: number }>
  nextSequence: number
}

type MetadataField = "name" | "description" | "auto_add" | "start_date" | "end_date" | "geo_area"

export default function ChecklistEditor({
  checklist,
}: {
  checklist: ChecklistEditorData
}) {
  const router = useRouter()
  const { geoAreas } = useTempusGeoAreas()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(checklist.name)
  const [description, setDescription] = useState(checklist.description)
  const [autoAdd, setAutoAdd] = useState(checklist.auto_add)
  const [geoAreaId, setGeoAreaId] = useState(checklist.geo_area ?? "")
  const [startDate, setStartDate] = useState(checklist.start_date ?? "")
  const [endDate, setEndDate] = useState(checklist.end_date ?? "")
  const [dirtyMetadataFields, setDirtyMetadataFields] = useState<Set<MetadataField>>(() => new Set())
  const [selected, setSelected] = useState<Set<string>>(() => new Set(checklist.species.map((species) => species.id)))
  const [knownSpecies, setKnownSpecies] = useState<Map<string, string>>(
    () => new Map(checklist.species.map((species) => [species.id, species.name])),
  )
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const selectedIds = useMemo(() => [...selected], [selected])
  const deferredQuery = useDeferredValue(query)
  const { results: searchResults, loading: searchLoading } = useSpeciesPage({
    search: deferredQuery,
    pageSize: 8,
    enabled: deferredQuery.trim().length >= 2,
  })
  const addableSpecies = searchResults.filter((species) => !selected.has(species.id))
  const markMetadataDirty = (field: MetadataField) => {
    setDirtyMetadataFields((current) => new Set(current).add(field))
  }
  const toggleSpecies = (id: string, item?: TempusSpecies) => {
    if (item) setKnownSpecies((current) => new Map(current).set(id, speciesName(item)))
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setError(null)
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!name.trim()) return setError("Ge checklistan ett namn.")
    if (selected.size === 0) return setError("Välj minst en art.")
    if (startDate && endDate && endDate < startDate) return setError("Slutdatum kan inte vara före startdatum.")

    const initialSpeciesIds = new Set(checklist.species.map((species) => species.id))
    const addSpeciesIds = selectedIds.filter((id) => !initialSpeciesIds.has(id))
    const removedSpecies = checklist.species.filter((species) => !selected.has(species.id))
    if (removedSpecies.some((species) => !species.itemId)) {
      return setError("Checklistan saknar rad-ID för en art och kan inte sparas.")
    }
    const removeItemIds = removedSpecies.map((species) => species.itemId)
    const metadata = {
      ...(dirtyMetadataFields.has("name") ? { name: name.trim() } : {}),
      ...(dirtyMetadataFields.has("description") ? { description: description.trim() } : {}),
      ...(dirtyMetadataFields.has("auto_add") ? { auto_add: autoAdd } : {}),
      ...(dirtyMetadataFields.has("start_date") ? { start_date: startDate || null } : {}),
      ...(dirtyMetadataFields.has("end_date") ? { end_date: endDate || null } : {}),
      ...(dirtyMetadataFields.has("geo_area") ? { geo_area: geoAreaId || null } : {}),
    }
    startTransition(async () => {
      const result = await updateChecklist(checklist.id, {
        metadata,
        addSpeciesIds,
        removeItemIds,
        nextSequence: checklist.nextSequence,
      })
      if (result.error) return setError(result.error)
      router.push(`/checklistor/${checklist.id}`)
    })
  }

  return (
    <div className="container mx-auto py-5 max-sm:px-3 sm:py-7">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link href={`/checklistor/${checklist.id}`} className="font-mono text-[10px] uppercase tracking-[.16em] text-text-muted no-underline hover:text-accent">
          ← Till checklistan
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[.16em] text-text-faint">Ändringsblad</span>
      </div>

      <form onSubmit={submit}>
        <article className="overflow-hidden rounded-card border border-border bg-surface text-text shadow-card">
          <header className="px-4 pb-3 pt-3 sm:px-5 sm:pb-4">
            <div className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[9px] italic text-text-faint">
              <span>Fältförteckning</span>
              <span>Redigera</span>
            </div>
            <div className="border-b border-border px-3 py-3 text-center sm:py-4">
              <label>
                <span className="sr-only">Checklistans namn</span>
                <input value={name} onChange={(event) => { setName(event.target.value); markMetadataDirty("name") }} className="w-full border-0 bg-transparent text-center font-display text-2xl font-medium italic tracking-wide text-text outline-none placeholder:text-text-faint sm:text-3xl" placeholder="Checklistans namn" />
              </label>
              <label className="mx-auto mt-1 block max-w-xl">
                <span className="sr-only">Beskrivning</span>
                <textarea value={description} onChange={(event) => { setDescription(event.target.value); markMetadataDirty("description") }} rows={2} className="w-full resize-none border-0 bg-transparent text-center font-display text-xs italic leading-5 text-text-muted outline-none placeholder:text-text-faint" placeholder="Beskrivning (valfritt)" />
              </label>
            </div>
            <div className="grid border-b border-border font-display text-[11px] sm:grid-cols-3">
              <label className="flex flex-col gap-1 border-b border-border px-3 py-2 sm:border-b-0 sm:border-r">
                <span className="italic text-text-faint">Område</span>
                <select value={geoAreaId} onChange={(event) => { setGeoAreaId(event.target.value); markMetadataDirty("geo_area") }} className="w-full bg-transparent text-xs outline-none">
                  <option value="">—</option>
                  {geoAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 border-b border-border px-3 py-2 sm:border-b-0 sm:border-r">
                <span className="italic text-text-faint">Start</span>
                <input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); markMetadataDirty("start_date") }} className="bg-transparent text-xs outline-none" />
              </label>
              <label className="flex flex-col gap-1 px-3 py-2">
                <span className="italic text-text-faint">Slut</span>
                <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => { setEndDate(event.target.value); markMetadataDirty("end_date") }} className="bg-transparent text-xs outline-none" />
              </label>
            </div>
          </header>

          <section className="px-3 pb-3 sm:px-5 sm:pb-5">
            <div className="flex items-center justify-between border-b border-border py-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[.14em] text-text-faint">Artförteckning</p>
                <h2 className="font-display text-lg font-medium italic">{selected.size} {selected.size === 1 ? "art" : "arter"}</h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  <a href="#lagg-till-art" className="font-display text-xs italic text-accent underline underline-offset-4 hover:text-accent-hover">+ 1 rad</a>
                  <label className="flex items-center gap-2 font-display text-[11px] italic text-text-faint">
                    <input type="checkbox" checked={autoAdd} onChange={(event) => { setAutoAdd(event.target.checked); markMetadataDirty("auto_add") }} className="size-4 accent-[var(--accent)]" />
                    Lägg till automatiskt
                  </label>
                  <Button type="submit" variant="paper" size="sm" rounded="rounded-none" disabled={pending}>
                    {pending ? "Sparar…" : "Spara"}
                  </Button>
                </div>
                {error ? <p className="max-w-sm text-right text-xs text-danger" role="alert">{error}</p> : null}
              </div>
            </div>

            {selectedIds.length > 0 ? (
              <ul className="grid grid-cols-2 border-b border-border">
                {selectedIds.map((id) => {
                  const species = knownSpecies.get(id)
                  return <li key={id} className="flex min-w-0 items-center justify-between gap-2 border-b border-border px-2 py-2.5 odd:border-r">
                    <span className="min-w-0 truncate text-sm">{species ?? "Okänd art"}</span>
                    <button type="button" onClick={() => toggleSpecies(id)} className="shrink-0 font-display text-xs italic text-text-muted underline underline-offset-4 hover:text-danger">Ta bort</button>
                  </li>
                })}
              </ul>
            ) : null}

            <div id="lagg-till-art" className="border-b border-border py-3">
              <label className="flex items-center gap-3">
                <span className="shrink-0 font-display text-sm italic text-text-muted">Lägg till</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Sök namn eller Dyntaxa-ID"
                  className="h-9 min-w-0 flex-1 rounded-none border border-field-border bg-surface px-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </label>
              {deferredQuery.trim().length >= 2 ? (
                <div className="mt-2 divide-y divide-border border-y border-border">
                  {searchLoading ? <p className="px-2 py-2 text-xs text-text-muted">Söker…</p> : null}
                  {!searchLoading && addableSpecies.length === 0 ? <p className="px-2 py-2 text-xs text-text-muted">Inga nya arter hittades.</p> : null}
                  {addableSpecies.map((species) => (
                    <button key={species.id} type="button" onClick={() => { toggleSpecies(species.id, species); setQuery("") }} className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left hover:bg-accent-wash">
                      <span className="min-w-0 truncate text-sm">{speciesName(species)}</span>
                      <span className="shrink-0 font-display text-xs italic text-accent">Lägg till</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {error ? <p className="mt-3 border-y border-danger px-2 py-2 text-sm text-danger" role="alert">{error}</p> : null}
            <div className="mt-3 flex items-center gap-3">
              <Button type="submit" variant="paper" size="sm" rounded="rounded-none" disabled={pending}>
                {pending ? "Sparar…" : "Spara ändringar"}
              </Button>
              <Link href={`/checklistor/${checklist.id}`} className="text-xs text-text-muted hover:text-text">Avbryt</Link>
            </div>
          </section>
        </article>
      </form>
    </div>
  )
}
