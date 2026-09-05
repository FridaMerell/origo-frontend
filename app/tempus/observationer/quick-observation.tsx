import { Binoculars, Check, Loader2, Plus, X } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog"
import { createObservation } from "@/app/tempus/_actions/observations"
import { parseLatLon } from "@/app/tempus/formatters"
import { PlacePicker } from "./quick-observation/place-picker"
import { SpeciesPicker, type PresetChecklistItem, type PresetSpecies } from "./quick-observation/species-picker"

function nowLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export default function QuickObservation({
  hideTrigger = false,
  species = null,
  checklistItem = null,
  onConsumed,
  onSaved,
}: {
  hideTrigger?: boolean
  species?: PresetSpecies | null
  checklistItem?: PresetChecklistItem | null
  onConsumed?: () => void
  onSaved?: (checklistItemIds: string[], observationId?: string) => void
} = {}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [entered, setEntered] = useState(false)

  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<PresetSpecies | null>(null)
  const [count, setCount] = useState("1")
  const [observedAt, setObservedAt] = useState(nowLocal())
  const [lat, setLat] = useState("")
  const [lon, setLon] = useState("")
  const [showTime, setShowTime] = useState(false)
  const [showPlace, setShowPlace] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [notes, setNotes] = useState("")
  const [keepCommentForNext, setKeepCommentForNext] = useState(false)
  const [checklistItems, setChecklistItems] = useState<PresetChecklistItem[]>([])
  const [selectedChecklistItemIds, setSelectedChecklistItemIds] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => setEntered(true))
    const focus = setTimeout(() => searchRef.current?.focus(), 120)
    return () => {
      cancelAnimationFrame(id)
      clearTimeout(focus)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const onConsumedRef = useRef(onConsumed)
  onConsumedRef.current = onConsumed

  useEffect(() => {
    if (!species) return
    const nextChecklistItems = checklistItem ? [checklistItem] : (species.checklistItems ?? [])
    setPicked(species)
    setChecklistItems(nextChecklistItems)
    setSelectedChecklistItemIds(nextChecklistItems.map((item) => item.id))
    setQuery("")
    setError(null)
    setSaved(null)
    setEntered(false)
    setOpen(true)
    onConsumedRef.current?.()
  }, [species, checklistItem])

  const reset = ({ keepComment = false } = {}) => {
    setQuery("")
    setPicked(null)
    setChecklistItems([])
    setSelectedChecklistItemIds([])
    setCount("1")
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
    setShowComment(false)
    setNotes("")
    setKeepCommentForNext(false)
  }

  const hasDraft = Boolean(query || picked || count !== "1" || lat || lon || notes || selectedChecklistItemIds.length > 0 || showTime || showPlace || showComment)

  const requestClose = () => {
    if (pending) return
    if (hasDraft) {
      setConfirmingCancel(true)
      return
    }
    close()
  }

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
      const result = await createObservation({
        species: picked.id,
        checklist_items: selectedChecklistItemIds,
        observed_at: new Date(observedAt).toISOString(),
        ...(location ? { location } : {}),
        count: trimmed ? Number(trimmed) : null,
        notes: notes.trim(),
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.refresh()
      onSaved?.(selectedChecklistItemIds, result.observationId)
      setSaved(`${label} sparad.`)
      reset({ keepComment: keepCommentForNext })
      requestAnimationFrame(() => searchRef.current?.focus())
    })
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
                  onPick={(nextPicked) => {
                    setPicked(nextPicked)
                    setChecklistItems(nextPicked?.checklistItems ?? [])
                    setSelectedChecklistItemIds((nextPicked?.checklistItems ?? []).map((item) => item.id))
                  }}
                  onClearError={() => setError(null)}
                  onSubmit={() => formRef.current?.requestSubmit()}
                />

              {checklistItems.length > 0 ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium">Checklistor</legend>
                  <div className="flex flex-col gap-1.5">
                      {checklistItems.map((item) => {
                        const checked = selectedChecklistItemIds.includes(item.id)
                        return (
                          <label
                            key={item.id}
                            className="flex min-h-10 items-center gap-3 rounded border border-field-border px-3 text-sm text-text hover:border-border-strong"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedChecklistItemIds((current) =>
                                  checked ? current.filter((id) => id !== item.id) : [...current, item.id],
                                )
                              }}
                              className="size-4 accent-accent"
                            />
                            {item.name}
                          </label>
                        )
                      })}
                  </div>
                </fieldset>
              ) : null}

              <div className={showTime ? "grid gap-4 sm:grid-cols-2" : undefined}>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Antal
                  <input
                    inputMode="numeric"
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                    placeholder="Antal"
                    className="rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
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
                      className="rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text focus:border-accent focus:outline-none"
                    />
                  </label>
                ) : null}
              </div>

              {!showTime || !showPlace || !showComment ? (
                <div className="flex flex-wrap gap-3 text-sm">
                  {!showTime ? (
                    <button
                      type="button"
                      onClick={() => setShowTime(true)}
                      className="text-text-muted hover:text-text"
                    >
                      + Tidpunkt
                    </button>
                  ) : null}
                  {!showPlace ? (
                    <button
                      type="button"
                      onClick={() => setShowPlace(true)}
                      className="text-text-muted hover:text-text"
                    >
                      + Position
                    </button>
                  ) : null}
                  {!showComment ? (
                    <button
                      type="button"
                      onClick={() => setShowComment(true)}
                      className="text-text-muted hover:text-text"
                    >
                      + Kommentar
                    </button>
                  ) : null}
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
                      className="resize-none rounded border border-field-border bg-surface px-3 py-2.5 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
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

              {error ? (
                <p className="rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              </div>

              <div className="border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {saved ? (
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
                  {
                    pending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )
                  }
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
