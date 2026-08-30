"use client"

import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps"
import { Button } from "@/app/components/ui/Button"
import { CurrentLocationButton } from "@/app/components/ui/CurrentLocationButton"
import { Icon } from "@/app/components/ui/Icon"
import { createObservation } from "@/app/actions/tempus"
import { GOOGLE_MAPS_API_KEY } from "@/app/lib/config"
import { speciesName } from "@/app/lib/tempus-context"
import { useSpeciesPage } from "@/app/tempus/ui/use-species-page"

type SavedPlace = { name: string; lat: string; lon: string }
const PLACES_KEY = "tempus:observation-places"

function loadPlaces(): SavedPlace[] {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PLACES_KEY) ?? "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is SavedPlace =>
        p &&
        typeof p.name === "string" &&
        typeof p.lat === "string" &&
        typeof p.lon === "string",
    )
  } catch {
    return []
  }
}

/** Google Places Autocomplete input, biased to Sweden; resolves to lat/lon. */
function PlaceSearch({
  onPick,
}: {
  onPick: (coords: { lat: string; lon: string }) => void
}) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    if (!places || !inputRef.current) return
    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ["geometry"],
      componentRestrictions: { country: "se" },
    })
    const listener = autocomplete.addListener("place_changed", () => {
      const point = autocomplete.getPlace().geometry?.location
      if (!point) return
      onPickRef.current({ lat: point.lat().toFixed(6), lon: point.lng().toFixed(6) })
    })
    return () => listener.remove()
  }, [places])

  return (
    <input
      ref={inputRef}
      type="search"
      placeholder="Sök plats"
      autoComplete="off"
      className="h-10 w-full rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
    />
  )
}

function nowLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

type PresetSpecies = { id: string; label: string; scientific: string }

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
  const [places, setPlaces] = useState<SavedPlace[]>([])
  const [placeName, setPlaceName] = useState("")
  const [manualCoords, setManualCoords] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const deferredQuery = useDeferredValue(query)

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

  const {
    results: matches,
    page: speciesPage,
    setPage: setSpeciesPage,
    totalPages: speciesTotalPages,
    loading: speciesLoading,
  } = useSpeciesPage({
    search: deferredQuery,
    pageSize: 8,
    enabled: deferredQuery.trim().length >= 2 && !picked,
  })

  useEffect(() => {
    setPlaces(loadPlaces())
  }, [])

  const persistPlaces = (next: SavedPlace[]) => {
    setPlaces(next)
    try {
      window.localStorage.setItem(PLACES_KEY, JSON.stringify(next))
    } catch {
      // ignore quota/availability errors
    }
  }

  const savePlace = () => {
    const name = placeName.trim()
    if (!name) return
    const latNum = Number(lat.trim().replace(",", "."))
    const lonNum = Number(lon.trim().replace(",", "."))
    if (
      !Number.isFinite(latNum) ||
      Math.abs(latNum) > 90 ||
      !Number.isFinite(lonNum) ||
      Math.abs(lonNum) > 180
    ) {
      setError("Ogiltig koordinat.")
      return
    }
    persistPlaces(
      [
        { name, lat: String(latNum), lon: String(lonNum) },
        ...places.filter((p) => p.name !== name),
      ].slice(0, 12),
    )
    setPlaceName("")
  }

  const removePlace = (name: string) => {
    persistPlaces(places.filter((p) => p.name !== name))
  }

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
    setPlaceName("")
    setManualCoords(false)
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
          <Icon name="plus" size={18} />
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
                <Icon name="binoculars" size={16} className="text-accent" />
                Ny observation
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Stäng"
                className="text-text-muted hover:text-text"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form className="flex flex-col gap-4 overflow-y-auto p-4" onSubmit={submit}>
              <div className="relative flex flex-col gap-1.5 text-sm font-medium">
                Art
                {picked ? (
                  <div className="flex items-center justify-between gap-3 rounded border border-field-border bg-surface-2 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{picked.label}</span>
                      <span className="block truncate font-mono text-[11px] text-text-muted">
                        {picked.scientific}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={reset}
                      aria-label="Byt art"
                      className="shrink-0 text-text-faint hover:text-text"
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ) : (
                  <span className="relative">
                    <Icon
                      name="search"
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
                    />
                    <input
                      ref={searchRef}
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Sök art"
                      autoComplete="off"
                      className="w-full rounded border border-field-border bg-surface py-2.5 pl-9 pr-3 font-normal text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                    />
                  </span>
                )}
                {deferredQuery.trim().length >= 2 && !picked ? (
                  <div className="mt-1 overflow-hidden rounded border border-border bg-surface shadow-md">
                  <ul className="max-h-64 overflow-y-auto">
                    {matches.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPicked({
                              id: item.id,
                              label: speciesName(item),
                              scientific: item.scientific_name,
                            })
                            setQuery("")
                            setError(null)
                          }}
                          className="block w-full border-b border-border px-3 py-2 text-left text-sm font-normal last:border-b-0 hover:bg-accent-wash hover:text-accent"
                        >
                          <span className="font-medium">{speciesName(item)}</span>
                          <span className="ml-2 font-mono text-[11px] text-text-muted">
                            {item.scientific_name}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {speciesLoading ? <p className="px-3 py-2 text-xs text-text-muted">Hämtar arter…</p> : null}
                  {!speciesLoading && matches.length === 0 ? <p className="px-3 py-2 text-xs text-text-muted">Inga arter matchar.</p> : null}
                  {speciesTotalPages > 1 ? (
                    <div className="flex items-center justify-between border-t border-border px-2 py-1.5 text-xs text-text-muted">
                      <button type="button" disabled={speciesPage === 1} onClick={() => setSpeciesPage(speciesPage - 1)} className="disabled:text-text-faint">Föregående</button>
                      <span>{speciesPage} / {speciesTotalPages}</span>
                      <button type="button" disabled={speciesPage === speciesTotalPages} onClick={() => setSpeciesPage(speciesPage + 1)} className="disabled:text-text-faint">Nästa</button>
                    </div>
                  ) : null}
                  </div>
                ) : null}
              </div>

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
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-sm font-medium">
                      Position <span className="font-normal text-text-faint">(valfritt)</span>
                    </legend>

                    {lat.trim() && lon.trim() ? (
                      <div className="flex items-center justify-between gap-2 rounded border border-field-border bg-surface-2 px-3 py-2">
                        <span className="truncate font-mono text-xs text-text-muted">
                          {lat}, {lon}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLat("")
                            setLon("")
                          }}
                          className="shrink-0 text-xs text-text-faint hover:text-text"
                        >
                          Rensa
                        </button>
                      </div>
                    ) : null}

                    {GOOGLE_MAPS_API_KEY ? (
                      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
                        <PlaceSearch
                          onPick={({ lat: nextLat, lon: nextLon }) => {
                            setLat(nextLat)
                            setLon(nextLon)
                            setError(null)
                          }}
                        />
                      </APIProvider>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <CurrentLocationButton
                        size="sm"
                        className="h-9"
                        onLocate={({ latitude, longitude }) => {
                          setLat(latitude.toFixed(6))
                          setLon(longitude.toFixed(6))
                          setError(null)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setManualCoords((value) => !value)}
                        className="text-text-muted hover:text-text"
                      >
                        {manualCoords ? "Dölj koordinater" : "Ange koordinater"}
                      </button>
                    </div>

                    {manualCoords ? (
                      <div className="flex flex-wrap items-start gap-2">
                        <input
                          inputMode="decimal"
                          value={lat}
                          onChange={(event) => setLat(event.target.value)}
                          placeholder="Latitud"
                          className="h-10 min-w-0 flex-1 basis-28 rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                        />
                        <input
                          inputMode="decimal"
                          value={lon}
                          onChange={(event) => setLon(event.target.value)}
                          placeholder="Longitud"
                          className="h-10 min-w-0 flex-1 basis-28 rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                        />
                      </div>
                    ) : null}

                    {places.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-normal text-text-faint">Sparade platser</span>
                        <div className="flex flex-wrap gap-1.5">
                          {places.map((place) => (
                            <span
                              key={place.name}
                              className="inline-flex items-center gap-1 rounded border border-field-border bg-surface-2 py-1 pl-2 pr-1 text-xs"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setLat(place.lat)
                                  setLon(place.lon)
                                  setError(null)
                                }}
                                className="font-medium text-text hover:text-accent"
                              >
                                {place.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => removePlace(place.name)}
                                aria-label={`Ta bort ${place.name}`}
                                className="text-text-faint hover:text-text"
                              >
                                <Icon name="x" size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {lat.trim() && lon.trim() ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={placeName}
                          onChange={(event) => setPlaceName(event.target.value)}
                          placeholder="Namnge platsen"
                          className="h-9 min-w-0 flex-1 basis-40 rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={savePlace}
                          disabled={!placeName.trim()}
                          className="h-9 shrink-0 rounded border border-field-border px-3 text-sm text-text-muted hover:text-text disabled:text-text-faint"
                        >
                          Spara plats
                        </button>
                      </div>
                    ) : null}
                </fieldset>
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
                  <Icon name="check" size={15} />
                  {saved} Lägg till nästa.
                </p>
              ) : null}

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" disabled={pending || !picked} className="flex-1 justify-center">
                  <Icon
                    name={pending ? "loader" : "check"}
                    size={16}
                    className={pending ? "animate-spin" : ""}
                  />
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
