import { Binoculars, Check, Loader2, Plus, X } from "lucide-react"
import { useEffect, useImperativeHandle, useMemo, useRef, useState, useTransition, type Ref } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog"
import { createObservation } from "@/app/tempus/_actions/observations"
import { parseLatLon } from "@/app/tempus/formatters"
import { PlacePicker } from "./quick-observation/place-picker"
import { SpeciesPicker, type PresetChecklistItem, type PresetSpecies } from "./quick-observation/species-picker"
import { LocaleField } from "@/app/tempus/locale-match"
import { ObservationPhotoPicker, readPhotoMetadata, toDateTimeLocal, uploadObservationPhotos, type PhotoMetadata } from "./observation-photos"

const INPUT_CLASS =
  "rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"

const STAGE_BUTTON_ACTIVE = "border-accent bg-accent-wash text-accent"
const STAGE_BUTTON_IDLE = "border-field-border text-text-muted hover:border-border-strong"

function nowLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function defaultLifeStage(stages?: string[]) {
  const matches = (stage: string, name: string) =>
    stage.localeCompare(name, "sv", { sensitivity: "accent" }) === 0
  return stages?.find((stage) => matches(stage, "Imago"))
    ?? stages?.find((stage) => matches(stage, "Blomma"))
    ?? ""
}

/**
 * Tangent 1..n väljer livsstadium nummer n, tangent 0 väljer "Annat".
 * Returnerar index i `stages`, `stages.length` för "Annat", eller null om tangenten inte är en genväg.
 */
export function stageShortcutIndex(key: string, stageCount: number) {
  const index = key === "0" ? stageCount : Number(key) - 1
  return Number.isInteger(index) && index >= 0 && index <= stageCount ? index : null
}

function LifeStageField({
  stages,
  lifeStage,
  custom,
  onSelectStage,
  onSelectCustom,
  onLifeStageChange,
}: {
  stages: string[]
  lifeStage: string
  custom: boolean
  onSelectStage: (stage: string) => void
  onSelectCustom: () => void
  onLifeStageChange: (value: string) => void
}) {
  const customInputRef = useRef<HTMLInputElement>(null)

  const selectCustom = () => {
    onSelectCustom()
    requestAnimationFrame(() => customInputRef.current?.focus())
  }

  // Genvägarna fungerar överallt i dialogen utom när man skriver i ett fält.
  // Prenumerationen sätts om vid varje render så att callbacks och `stages` alltid är aktuella.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable='true']")) return
      const index = stageShortcutIndex(event.key, stages.length)
      if (index === null) return
      event.preventDefault()
      if (index === stages.length) selectCustom()
      else onSelectStage(stages[index])
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium">Livsstadie <span className="font-normal text-text-muted">(valfritt)</span></legend>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Livsstadie">
        {stages.map((stage, index) => (
          <button
            key={stage}
            type="button"
            aria-keyshortcuts={String(index + 1)}
            onClick={() => onSelectStage(stage)}
            className={`rounded border px-3 py-1.5 text-sm ${lifeStage === stage && !custom ? STAGE_BUTTON_ACTIVE : STAGE_BUTTON_IDLE}`}
          >
            {index + 1}. {stage}
          </button>
        ))}
        <button
          type="button"
          aria-keyshortcuts="0"
          onClick={selectCustom}
          className={`rounded border px-3 py-1.5 text-sm ${custom ? STAGE_BUTTON_ACTIVE : STAGE_BUTTON_IDLE}`}
        >
          0. Annat
        </button>
      </div>
      {custom ? (
        <input
          value={lifeStage}
          ref={customInputRef}
          onChange={(event) => onLifeStageChange(event.target.value)}
          placeholder="Ange livsstadie"
          aria-label="Annat livsstadie"
          className={`${INPUT_CLASS} text-sm`}
        />
      ) : null}
    </fieldset>
  )
}

function AddOptionalButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-text-muted hover:text-text">
      {label}
    </button>
  )
}

/** Öppnar dialogen utifrån, med förvald art (och ev. checklistpost) och/eller bilder. */
export type QuickObservationHandle = {
  open: (preset: { species?: PresetSpecies; checklistItem?: PresetChecklistItem; photos?: File[] }) => void
}

export default function QuickObservation({
  ref,
  hideTrigger = false,
  onSaved,
}: {
  ref?: Ref<QuickObservationHandle>
  hideTrigger?: boolean
  onSaved?: (checklistItemIds: string[], observationId?: string) => void
} = {}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)

  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<PresetSpecies | null>(null)
  const [count, setCount] = useState("1")
  const [lifeStage, setLifeStage] = useState("")
  const [customLifeStage, setCustomLifeStage] = useState(false)
  const [observedAt, setObservedAt] = useState(nowLocal())
  const [lat, setLat] = useState("")
  const [lon, setLon] = useState("")
  const [showTime, setShowTime] = useState(false)
  const [showPlace, setShowPlace] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<File[]>([])
  const [keepCommentForNext, setKeepCommentForNext] = useState(false)
  const [checklistItems, setChecklistItems] = useState<PresetChecklistItem[]>([])
  const [selectedChecklistItemIds, setSelectedChecklistItemIds] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const stages = useMemo(() => picked?.stages ?? [], [picked])

  const searchRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const focusSearch = () => requestAnimationFrame(() => searchRef.current?.focus())

  /** Väljer (eller avmarkerar, vid null) art och återställer allt som hör till arten. */
  const selectSpecies = (
    next: PresetSpecies | null,
    items: PresetChecklistItem[] = next?.checklistItems ?? [],
  ) => {
    setPicked(next)
    setLifeStage(defaultLifeStage(next?.stages))
    setCustomLifeStage(false)
    setChecklistItems(items)
    setSelectedChecklistItemIds(items.map((item) => item.id))
  }

  const selectLifeStage = (stage: string) => {
    setCustomLifeStage(false)
    setLifeStage(stage)
  }

  const selectCustomLifeStage = () => {
    setCustomLifeStage(true)
    if (stages.includes(lifeStage)) setLifeStage("")
  }

  const reset = ({ keepComment = false } = {}) => {
    setQuery("")
    selectSpecies(null)
    setCount("1")
    setPhotos([])
    setError(null)
    if (!keepComment) {
      setNotes("")
      setShowComment(false)
      setKeepCommentForNext(false)
    }
  }

  const close = () => {
    setEntered(false)
    setOpen(false)
    setSaved(null)
    reset()
    setObservedAt(nowLocal())
    setLat("")
    setLon("")
    setShowTime(false)
    setShowPlace(false)
  }

  const hasDraft = Boolean(query || picked || count !== "1" || lifeStage || lat || lon || notes || photos.length > 0 || selectedChecklistItemIds.length > 0 || showTime || showPlace || showComment)

  const requestClose = () => {
    if (pending) return
    if (hasDraft) {
      setConfirmingCancel(true)
      return
    }
    close()
  }

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => setEntered(true))
    const focus = setTimeout(() => searchRef.current?.focus(), 120)
    return () => {
      cancelAnimationFrame(id)
      clearTimeout(focus)
    }
  }, [open])

  // Escape: först ångra valet av art, sedan stäng. Prenumerationen sätts om vid varje render
  // så att requestClose alltid ser aktuellt utkast (hasDraft/pending).
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (picked) {
        selectSpecies(null)
        setError(null)
        focusSearch()
        return
      }
      requestClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  })

  const applyPhotoMetadata = ({ takenAt, lat: photoLat, lon: photoLon }: PhotoMetadata) => {
    if (takenAt) {
      setObservedAt(toDateTimeLocal(takenAt))
      setShowTime(true)
    }
    if (photoLat !== undefined && photoLon !== undefined) {
      setLat(photoLat.toFixed(6))
      setLon(photoLon.toFixed(6))
      setShowPlace(true)
    }
  }

  /** Bifogar de dragna bilderna (efter eller i stället för de som redan finns) och fyller i tid och plats ur deras EXIF. */
  const attachPhotos = (files: File[], { replace = false } = {}) => {
    const images = files.filter((file) => file.type.startsWith("image/"))
    const skipped = files.filter((file) => !file.type.startsWith("image/"))
    setPhotos((current) => (replace ? images : [...current, ...images]))
    if (skipped.length > 0) {
      setError(`Bara bilder kan läggas till. Hoppade över: ${skipped.map((file) => file.name).join(", ")}.`)
    }
    if (images.length === 0) return
    readPhotoMetadata(images)
      .then(applyPhotoMetadata)
      .catch(() => setError("Tid och position kunde inte läsas ur bilderna. Fyll i dem för hand."))
  }

  // Förvald art (och ev. checklistpost) och/eller bilder dragna in utifrån: öppna dialogen direkt.
  useImperativeHandle(ref, () => ({
    open: ({ species, checklistItem, photos: presetPhotos }) => {
      setError(null)
      if (species) {
        selectSpecies(species, checklistItem ? [checklistItem] : (species.checklistItems ?? []))
        setQuery("")
      }
      if (presetPhotos) attachPhotos(presetPhotos, { replace: true })
      setSaved(null)
      setEntered(false)
      setOpen(true)
    },
  }))

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSaved(null)

    if (!picked) {
      setError("Välj en art.")
      return
    }
    const trimmed = count.trim()
    if (trimmed && !/^\d+$/.test(trimmed)) {
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

    const label = picked.label

    startTransition(async () => {
      setProgress("Sparar observationen…")
      try {
        const result = await createObservation({
          species: picked.id,
          checklist_items: selectedChecklistItemIds,
          observed_at: new Date(observedAt).toISOString(),
          ...(location ? { location } : {}),
          count: trimmed ? Number(trimmed) : null,
          life_stage: lifeStage.trim(),
          notes: notes.trim(),
        })

        if (result.error) {
          setError(result.error)
          return
        }

        let photoError: string | null = null
        if (photos.length > 0) {
          photoError = result.observationId
            ? await uploadObservationPhotos(result.observationId, [], photos, setProgress).catch(() => "Bilderna kunde inte laddas upp.")
            : "Observationen sparades men dess id saknades i svaret, så bilderna kunde inte laddas upp."
        }

        router.refresh()
        onSaved?.(selectedChecklistItemIds, result.observationId)
        setSaved(`${label} sparad.`)
        reset({ keepComment: keepCommentForNext })
        if (photoError) {
          setError(`${photoError} Observationen är sparad; lägg till bilderna från den.`)
        }
        focusSearch()
      } catch {
        setError("Observationen kunde inte sparas. Kontrollera anslutningen och försök igen.")
      } finally {
        setProgress(null)
      }
    })
  }

  const toggleChecklistItem = (id: string) => {
    setSelectedChecklistItemIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    )
  }

  return (
    <>
      {hideTrigger ? null : (
        <button
          type="button"
          onClick={() => {
            setEntered(false)
            setOpen(true)
          }}
          aria-label="Ny observation"
          title="Ny observation"
          className="flex size-10 items-center justify-center rounded bg-accent text-accent-contrast hover:bg-accent-hover"
        >
          <Plus size={18} />
        </button>
      )}

      {open ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 transition-opacity sm:items-center"
          style={{
            transitionDuration: "var(--duration-normal)",
            transitionTimingFunction: "var(--ease-standard)",
            opacity: entered ? 1 : 0,
          }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) requestClose()
          }}
          // Så länge ingen art är vald kan bilder släppas var som helst i dialogen.
          // Bildväljarens egen släppyta tar hand om sina bilder själv (defaultPrevented).
          onDrop={(event) => {
            if (event.defaultPrevented || picked || !event.dataTransfer.types.includes("Files")) return
            event.preventDefault()
            attachPhotos(Array.from(event.dataTransfer.files))
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Snabbregistrera observation"
            className="flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg transition-transform sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
            style={{
              transitionDuration: "var(--duration-normal)",
              transitionTimingFunction: "var(--ease-standard)",
              transform: entered ? "translateY(0)" : "translateY(2rem)",
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="m-0 flex items-center gap-2 font-display text-lg font-semibold text-text">
                <Binoculars size={16} className="text-accent" />
                Ny observation
              </h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Stäng"
                className="text-text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            <form ref={formRef} className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                <SpeciesPicker
                  searchRef={searchRef}
                  query={query}
                  onQueryChange={setQuery}
                  picked={picked}
                  onPick={(next) => selectSpecies(next)}
                  onClearError={() => setError(null)}
                  onSubmit={() => formRef.current?.requestSubmit()}
                />

                {checklistItems.length > 0 ? (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="text-sm font-medium">Checklistor</legend>
                    <div className="flex flex-col gap-1.5">
                      {checklistItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex min-h-10 items-center gap-3 rounded border border-field-border px-3 text-sm text-text hover:border-border-strong"
                        >
                          <input
                            type="checkbox"
                            checked={selectedChecklistItemIds.includes(item.id)}
                            onChange={() => toggleChecklistItem(item.id)}
                            className="size-4 accent-accent"
                          />
                          {item.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                {stages.length > 0 ? (
                  <LifeStageField
                    stages={stages}
                    lifeStage={lifeStage}
                    custom={customLifeStage}
                    onSelectStage={selectLifeStage}
                    onSelectCustom={selectCustomLifeStage}
                    onLifeStageChange={setLifeStage}
                  />
                ) : null}

                <div className={showTime ? "grid gap-4 sm:grid-cols-2" : undefined}>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Antal
                    <input
                      inputMode="numeric"
                      value={count}
                      onChange={(event) => setCount(event.target.value)}
                      placeholder="Antal"
                      className={INPUT_CLASS}
                    />
                  </label>

                  {showTime ? (
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Tidpunkt
                      <input
                        type="datetime-local"
                        value={observedAt}
                        max={nowLocal()}
                        onChange={(event) => setObservedAt(event.target.value)}
                        className={INPUT_CLASS}
                      />
                    </label>
                  ) : null}
                </div>

                <LocaleField
                  lat={lat}
                  lon={lon}
                  onChange={({ lat: nextLat, lon: nextLon }) => {
                    setLat(nextLat)
                    setLon(nextLon)
                    setShowPlace(true)
                    setError(null)
                  }}
                />

                {!showTime || !showPlace || !showComment ? (
                  <div className="flex flex-wrap gap-3 text-sm">
                    {!showTime ? <AddOptionalButton label="+ Tidpunkt" onClick={() => setShowTime(true)} /> : null}
                    {!showPlace ? <AddOptionalButton label="+ Position" onClick={() => setShowPlace(true)} /> : null}
                    {!showComment ? <AddOptionalButton label="+ Kommentar" onClick={() => setShowComment(true)} /> : null}
                  </div>
                ) : null}

                {showPlace ? (
                  <PlacePicker
                    lat={lat}
                    lon={lon}
                    onChange={({ lat: nextLat, lon: nextLon }) => {
                      setLat(nextLat)
                      setLon(nextLon)
                    }}
                    onClearError={() => setError(null)}
                    onError={setError}
                  />
                ) : null}

                {showComment ? (
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Kommentar
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={2}
                        className={`resize-none ${INPUT_CLASS}`}
                      />
                    </label>
                    <label className="flex items-center gap-2 self-start text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={keepCommentForNext}
                        onChange={(event) => setKeepCommentForNext(event.target.checked)}
                        className="size-3.5 accent-accent"
                      />
                      Behåll kommentar till nästa obs
                    </label>
                  </div>
                ) : null}

                <ObservationPhotoPicker
                  files={photos}
                  onChange={setPhotos}
                  onMetadata={applyPhotoMetadata}
                  onError={setError}
                />

                {error ? (
                  <p className="rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {progress ? (
                  <p className="mb-3 rounded bg-surface-2 px-3 py-2 text-sm text-text-muted" role="status">
                    {progress}
                  </p>
                ) : null}
                {!progress && saved ? (
                  <p className="mb-3 flex items-center gap-2 rounded bg-accent-wash px-3 py-2 text-sm text-accent" role="status">
                    <Check size={15} />
                    {saved} Lägg till nästa.
                  </p>
                ) : null}
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={requestClose}
                    className="text-sm text-text-muted hover:text-text"
                  >
                    Avbryt
                  </button>
                  <Button type="submit" variant="paper-bordered" disabled={pending || !picked} className="min-w-28 justify-center">
                    {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {pending ? "Sparar…" : "Spara"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.querySelector<HTMLElement>('[data-theme="tempus"]') ?? document.body,
      ) : null}

      <ConfirmDialog
        open={confirmingCancel}
        title="Avbryt registreringen?"
        message="Dina osparade uppgifter försvinner."
        confirmLabel="Avbryt registrering"
        cancelLabel="Fortsätt registrera"
        destructive
        onConfirm={() => {
          setConfirmingCancel(false)
          close()
        }}
        onCancel={() => setConfirmingCancel(false)}
      />
    </>
  )
}
