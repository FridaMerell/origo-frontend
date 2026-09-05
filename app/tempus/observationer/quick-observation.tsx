import { Binoculars, Check, Loader2, Plus, X } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { createObservation } from "@/app/tempus/_actions/observations"
import { parseLatLon } from "@/app/tempus/formatters"
import { PlacePicker } from "./quick-observation/place-picker"
import { SpeciesPicker, type PresetSpecies } from "./quick-observation/species-picker"

function nowLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export default function QuickObservation({
  hideTrigger = false,
  species = null,
  onConsumed,
}: {
  hideTrigger?: boolean
  species?: PresetSpecies | null
  onConsumed?: () => void
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

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)

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
        setEntered(false)
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const onConsumedRef = useRef(onConsumed)
  onConsumedRef.current = onConsumed

  useEffect(() => {
    if (!species) return
    setPicked(species)
    setQuery("")
    setError(null)
    setSaved(null)
    setEntered(false)
    setOpen(true)
    onConsumedRef.current?.()
  }, [species])

  const reset = () => {
    setQuery("")
    setPicked(null)
    setCount("1")
    setError(null)
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
        checklist_items: [],
        observed_at: new Date(observedAt).toISOString(),
        ...(location ? { location } : {}),
        count: trimmed ? Number(trimmed) : null,
        notes: "",
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.refresh()
      setSaved(`${label} sparad.`)
      reset()
      setTimeout(() => searchRef.current?.focus(), 0)
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
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Snabbregistrera observation"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-lg transition-transform sm:max-w-lg sm:rounded-2xl"
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
                onClick={close}
                aria-label="Stäng"
                className="text-text-muted hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            <form className="flex flex-col gap-4 overflow-y-auto p-4" onSubmit={submit}>
              <SpeciesPicker
                searchRef={searchRef}
                query={query}
                onQueryChange={setQuery}
                picked={picked}
                onPick={setPicked}
                onClearError={() => setError(null)}
              />

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

              {!showTime || !showPlace ? (
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
                </div>
              ) : null}

              {error ? (
                <p className="rounded bg-danger-wash px-3 py-2 text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              {saved ? (
                <p className="flex items-center gap-2 rounded bg-accent-wash px-3 py-2 text-sm text-accent" role="status">
                  <Check size={15} />
                  {saved} Lägg till nästa.
                </p>
              ) : null}

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" variant="paper" disabled={pending || !picked} className="flex-1 justify-center">
                  {
                    pending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )
                  }
                  {pending ? "Sparar…" : "Spara"}
                </Button>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-text-muted hover:text-text"
                >
                  Klar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.querySelector<HTMLElement>('[data-theme="tempus"]') ?? document.body,
      ) : null}
    </>
  )
}
