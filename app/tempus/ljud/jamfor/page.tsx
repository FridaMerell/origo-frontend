"use client"

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react"
import type { TempusSoundRecording, TempusSpeciesExtended } from "@/app/lib/dal"
import { copyText } from "@/app/components/ui/CopyButton"
import { usePageMeta } from "@/app/lib/use-page-meta"
import { Tabs, type TabItem } from "@/app/components/ui/Tabs"
import { useToast } from "@/app/components/ui/ToastProvider"
import { loadSpeciesByTaxonIds } from "@/app/tempus/_actions/species"
import { speciesName } from "@/app/tempus/_state/tempus-context"
import { ObservationSpeciesSearch } from "@/app/tempus/observationer/observation-species-search"
import { Plate, placeName, soundName } from "@/app/tempus/ui/sound-plate"
import { SonogramOverlay } from "@/app/tempus/ui/sonogram-overlay"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"
import { soundsOf } from "../sound-data"
import { inkOf, useCompareSpecies, type CompareSpecies } from "../use-compare"

const FIRST_VISIBLE = 8

type Mode = "overlay" | "split"
// How the view is written in a shared link.
const SHARE_MODES: Record<Mode, string> = { overlay: "ovanpa", split: "varforsig" }
const MODE_TABS: Array<TabItem<Mode>> = [
  { id: "overlay", label: "Ovanpå" },
  { id: "split", label: "Var för sig" },
]

type Progress = { current: number; playing: boolean }

function SpeciesCell({ item, extended, error, ink, overlay, chosenId, onChoose, onRecording, onProgress, onRemove }: {
  item: CompareSpecies
  /** Undefined while the species' recordings are being fetched. */
  extended: TempusSpeciesExtended | null | undefined
  error: string | undefined
  ink: string
  overlay: boolean
  chosenId: string | undefined
  onChoose: (id: string, recordingId: string) => void
  onRecording: (id: string, recording: TempusSoundRecording | null) => void
  onProgress: (id: string, progress: Progress) => void
  onRemove: () => void
}) {
  const [visible, setVisible] = useState(FIRST_VISIBLE)
  const [listOpen, setListOpen] = useState(false)

  const recordings = extended?.sounds?.recordings ?? []
  // A recording that is not among the fetched ones (for example from a shared link) falls back to the first.
  const selected = recordings.find((recording) => String(recording.id) === chosenId) ?? recordings[0]
  const message = (error ?? null)
    ?? (extended === null ? "Servern svarade inte." : null)
    ?? extended?.sounds_error
    ?? (extended && recordings.length === 0 ? `Inga inspelningar av ${item.name}.` : null)

  useEffect(() => { onRecording(item.id, selected ?? null) }, [item.id, selected, onRecording])

  return (
    <section className="min-w-0 border-b border-r border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium capitalize">
            <span aria-hidden="true" className="h-0.5 w-5 shrink-0" style={{ backgroundColor: `var(${ink})` }} />
            {item.name}
          </h2>
          {item.scientificName ? <p className="truncate font-display text-xs italic text-text-muted">{item.scientificName}</p> : null}
        </div>
        <button type="button" onClick={onRemove} className="shrink-0 font-display text-xs italic text-text-muted underline decoration-border max-sm:-my-2 max-sm:px-1 max-sm:py-2 max-sm:text-sm underline-offset-4 transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
          Ta bort
        </button>
      </div>

      {message ? (
        <p className="py-4 text-xs italic text-text-muted">{message}</p>
      ) : extended === undefined ? (
        <p role="status" className="py-4 text-xs italic text-text-muted">Hämtar inspelningar…</p>
      ) : selected ? (
        <div className="pt-3">
          <Plate
            key={String(selected.id)}
            recording={selected}
            compact
            ink={ink}
            hideSonogram={overlay}
            onProgress={(current, playing) => onProgress(item.id, { current, playing })}
          />
          <button type="button" aria-expanded={listOpen} onClick={() => setListOpen((current) => !current)} className="mt-2 font-display text-xs italic text-text-muted underline decoration-border max-sm:py-2 max-sm:text-sm underline-offset-4 transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
            {listOpen ? "Dölj inspelningar" : `Byt inspelning (${recordings.length})`}
          </button>
          {listOpen ? (
            <>
              <ol className="mt-2 border-l border-t border-border">
                {recordings.slice(0, visible).map((recording) => (
                  <li key={String(recording.id)} className="border-b border-r border-border">
                    <button type="button" onClick={() => onChoose(item.id, String(recording.id))} aria-current={recording === selected ? "true" : undefined}
                      className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-2 py-2 text-left font-display text-xs italic max-sm:py-3 max-sm:text-sm transition-colors hover:bg-accent-wash focus-visible:outline-2 focus-visible:outline-focus-ring ${recording === selected ? "text-accent" : "text-text"}`}>
                      <span className="min-w-0 truncate">{soundName(recording.sound_type)}</span>
                      <span className="tabular-nums text-text-muted">{recording.length}</span>
                      <span className="col-span-2 min-w-0 truncate text-[10px] text-text-faint">XC{recording.id} · {placeName(recording)}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {visible < recordings.length ? (
                <button type="button" onClick={() => setVisible((count) => count + 12)} className="mt-2 font-display text-xs italic text-accent underline decoration-accent/40 max-sm:py-2 max-sm:text-sm underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                  Visa fler ({recordings.length - visible} kvar)
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default function Page() {
  const { species, ready, add, replace, remove, has } = useCompareSpecies()
  usePageMeta({
    title: "Jämför ljud | Tempus",
    description: "Lyssna på och jämför läten och sonogram från olika arter sida vid sida.",
  })
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>("overlay")
  const [recordings, setRecordings] = useState<Record<string, TempusSoundRecording | null>>({})
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState<Record<string, Progress>>({})
  const [importing, setImporting] = useState(false)
  const [extendedById, setExtendedById] = useState<Record<string, TempusSpeciesExtended | null>>({})
  const [errorById, setErrorById] = useState<Record<string, string>>({})
  const requested = useRef(new Set<string>())

  // Every species still missing is fetched at once, each on its own, and shows as soon as it arrives.
  useEffect(() => {
    for (const { id } of species) {
      if (requested.current.has(id)) continue
      requested.current.add(id)
      soundsOf(id)
        .then((result) => setExtendedById((current) => ({ ...current, [id]: result })))
        .catch((caught) => {
          requested.current.delete(id)
          setErrorById((current) => ({ ...current, [id]: caught instanceof Error ? caught.message : String(caught) }))
        })
    }
  }, [species])

  // A shared link carries the sheet in its address. It is read once, the sheet is composed from it,
  // and the address is cleared again, so the page's own address stays plain.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shared = params.get("arter")
    if (!shared) return
    window.history.replaceState(null, "", window.location.pathname)
    const entries = shared.split(",").map((entry) => entry.split(":")).filter(([id]) => /^\d+$/.test(id ?? ""))
    if (entries.length === 0) return
    setMode(params.get("vy") === SHARE_MODES.split ? "split" : "overlay")
    setImporting(true)
    loadSpeciesByTaxonIds(entries.map(([id]) => id))
      .then((items) => {
        replace(items.map((item) => ({ id: String(item.dyntaxa_taxon_id), name: speciesName(item), scientificName: item.scientific_name })))
        setChosen(Object.fromEntries(entries.filter(([, recordingId]) => recordingId).map(([id, recordingId]) => [id, recordingId])))
      })
      .catch((caught) => toast({ title: "Kunde inte öppna den delade länken", description: caught instanceof Error ? caught.message : "Försök igen.", variant: "error" }))
      .finally(() => setImporting(false))
    // Runs once on arrival; `replace` and `toast` change identity on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const share = async () => {
    const parts = species.map((item) => (recordings[item.id] ? `${item.id}:${recordings[item.id]!.id}` : item.id))
    const link = `${window.location.origin}${window.location.pathname}?arter=${parts.join(",")}&vy=${SHARE_MODES[mode]}`
    try {
      if (window.matchMedia("(pointer: coarse)").matches && navigator.share) {
        await navigator.share({ title: "Jämför ljud", url: link })
        return
      }
      await copyText(link)
      toast({ title: "Länken är kopierad", variant: "success" })
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return
      toast({ title: "Kunde inte dela bladet", description: caught instanceof Error ? caught.message : "Försök igen.", variant: "error" })
    }
  }

  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const { results, loading, page, setPage, totalPages } = useSpeciesPage({ search: deferredQuery, enabled: deferredQuery.trim().length >= 2 })
  const matches = results.filter((item) => !has(String(item.dyntaxa_taxon_id)))

  const onRecording = useCallback((id: string, recording: TempusSoundRecording | null) => {
    setRecordings((current) => (current[id] === recording ? current : { ...current, [id]: recording }))
  }, [])
  const onProgress = useCallback((id: string, next: Progress) => {
    setProgress((current) => {
      const previous = current[id]
      return previous && previous.current === next.current && previous.playing === next.playing ? current : { ...current, [id]: next }
    })
  }, [])

  // All recordings start together from the beginning, or all stop.
  const anyPlaying = Object.values(progress).some((entry) => entry.playing)
  const toggleAll = () => {
    const audios = Array.from(document.querySelectorAll("audio"))
    if (anyPlaying) {
      audios.forEach((audio) => audio.pause())
      return
    }
    audios.forEach((audio) => {
      audio.currentTime = 0
      void audio.play().catch(() => undefined)
    })
  }

  const names = species.map((item) => item.name)
  const title = names.length > 0 ? new Intl.ListFormat("sv", { style: "long", type: "conjunction" }).format(names) : "Jämför ljud"
  const layers = species.flatMap((item, position) => {
    const recording = recordings[item.id]
    return recording ? [{ key: item.id, recording, ink: inkOf(position), name: item.name, current: progress[item.id]?.current ?? 0, playing: progress[item.id]?.playing ?? false }] : []
  })

  return (
    <div className="container mx-auto py-5 max-sm:px-3 sm:py-7">
      <article className="rounded-card border border-border bg-surface px-4 pb-5 pt-3 text-text shadow-card sm:px-6 sm:pb-6 sm:pt-4">
        <header className="flex items-center justify-between border-b border-border pb-1.5 font-display text-[11px] italic text-text-faint sm:text-[9px]">
          <span>Ljudblad</span>
          <span className="flex items-center gap-4">
            {ready ? <span>{species.length} {species.length === 1 ? "art" : "arter"}</span> : null}
            {species.length > 0 ? (
              <button type="button" onClick={() => void share()} className="cursor-pointer text-accent underline decoration-accent/40 underline-offset-4 transition-colors max-sm:-my-2 max-sm:py-2 max-sm:text-sm hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                Dela
              </button>
            ) : null}
          </span>
        </header>

        <div className="py-5 text-center">
          <h1 className="font-display text-xl font-medium italic tracking-wide text-balance first-letter:uppercase sm:text-3xl">{title}</h1>
        </div>

        <div className="border-t border-border">
        <ObservationSpeciesSearch
          label="Art att lägga till"
          query={query}
          onQueryChange={setQuery}
          showResults={query.trim().length >= 2}
          matches={matches}
          loading={loading}
          page={page}
          onPageChange={setPage}
          totalPages={totalPages}
          onAdd={(item) => {
            add({ id: String(item.dyntaxa_taxon_id), name: speciesName(item), scientificName: item.scientific_name })
            setQuery("")
          }}
        />
        </div>

        {!ready ? null : importing ? (
          <p role="status" className="py-8 text-center font-display text-sm italic text-text-muted">Hämtar det delade bladet…</p>
        ) : species.length === 0 ? null : (
          <>
            <Tabs tabs={MODE_TABS} active={mode} onChange={setMode} className="mt-5" />

            {mode === "overlay" && layers.length > 0 ? <div className="mt-3"><SonogramOverlay layers={layers} /></div> : null}

            {species.length > 1 ? (
              <div className="mt-3 flex">
                <button type="button" onClick={toggleAll} aria-label={anyPlaying ? "Pausa alla inspelningar" : "Spela alla inspelningar samtidigt"} className="group inline-flex cursor-pointer items-center gap-2.5 text-xs text-text transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  <span className="grid size-8 place-items-center rounded-full bg-accent text-surface transition-[background-color,transform] duration-150 group-hover:bg-accent-hover group-active:scale-95 motion-reduce:transition-none">
                    {anyPlaying ? <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3 fill-current"><path d="M3 2h3v12H3zm7 0h3v12h-3z" /></svg> : <svg aria-hidden="true" viewBox="0 0 16 16" className="ml-0.5 size-3 fill-current"><path d="M4 2.2v11.6L13 8z" /></svg>}
                  </span>
                  <span>{anyPlaying ? "Pausa alla" : "Spela alla samtidigt"}</span>
                </button>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] border-l border-t border-border md:grid-cols-2">
              {species.map((item, position) => (
                <SpeciesCell
                  key={item.id}
                  item={item}
                  extended={extendedById[item.id]}
                  error={errorById[item.id]}
                  ink={inkOf(position)}
                  overlay={mode === "overlay"}
                  chosenId={chosen[item.id]}
                  onChoose={(id, recordingId) => setChosen((current) => ({ ...current, [id]: recordingId }))}
                  onRecording={onRecording}
                  onProgress={onProgress}
                  onRemove={() => remove(item.id)}
                />
              ))}
            </div>
          </>
        )}
      </article>
    </div>
  )
}
