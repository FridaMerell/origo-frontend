import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react"
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps"
import { CurrentLocationButton } from "@/app/components/ui/CurrentLocationButton"
import { GOOGLE_MAPS_API_KEY } from "@/app/lib/config"
import { parseLatLon } from "@/app/tempus/formatters"
import { X } from "lucide-react"

type SavedPlace = { name: string; lat: string; lon: string }
const PLACES_KEY = "tempus:observation-places"

function parsePlaces(raw: string | null): SavedPlace[] {
  try {
    const parsed = JSON.parse(raw ?? "[]")
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

// The saved places live in localStorage, read through useSyncExternalStore:
// the server and the first client render see none, and every picker updates
// when the list changes (here or in another tab).
const NO_PLACES: SavedPlace[] = []
const placesListeners = new Set<() => void>()
let placesSnapshot: { raw: string | null; places: SavedPlace[] } = { raw: null, places: NO_PLACES }

function readPlacesRaw() {
  try {
    return window.localStorage.getItem(PLACES_KEY)
  } catch {
    return null
  }
}

function getPlaces() {
  const raw = readPlacesRaw()
  if (raw !== placesSnapshot.raw) placesSnapshot = { raw, places: parsePlaces(raw) }
  return placesSnapshot.places
}

function subscribePlaces(listener: () => void) {
  placesListeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    placesListeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

/** Saves the list; false when the browser would not store it. */
function storePlaces(next: SavedPlace[]) {
  try {
    window.localStorage.setItem(PLACES_KEY, JSON.stringify(next))
  } catch {
    return false
  }
  placesListeners.forEach((listener) => listener())
  return true
}

/** Google Places Autocomplete input, biased to Sweden; resolves to lat/lon. */
function PlaceSearch({
  onPick,
}: {
  onPick: (coords: { lat: string; lon: string }) => void
}) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  const pick = useEffectEvent(onPick)

  useEffect(() => {
    if (!places || !inputRef.current) return
    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ["geometry"],
      componentRestrictions: { country: "se" },
    })
    const listener = autocomplete.addListener("place_changed", () => {
      const point = autocomplete.getPlace().geometry?.location
      if (!point) return
      pick({ lat: point.lat().toFixed(6), lon: point.lng().toFixed(6) })
    })
    return () => listener.remove()
  }, [places])

  return (
    <input
      ref={inputRef}
      type="search"
      placeholder="Sök adress"
      autoComplete="off"
      className="h-10 w-full rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
    />
  )
}

export function PlacePicker({
  lat,
  lon,
  legend = "Position",
  onChange,
  onClearError,
  onError,
}: {
  lat: string
  lon: string
  legend?: string
  onChange: (coords: { lat: string; lon: string }) => void
  onClearError: () => void
  onError: (message: string) => void
}) {
  const places = useSyncExternalStore(subscribePlaces, getPlaces, () => NO_PLACES)
  const [placeName, setPlaceName] = useState("")
  const [manualCoords, setManualCoords] = useState(false)
  const [savingPlace, setSavingPlace] = useState(false)
  const hasCoords = Boolean(lat.trim() && lon.trim())
  const [editingPlace, setEditingPlace] = useState(() => !hasCoords)

  const persistPlaces = (next: SavedPlace[]) => {
    if (storePlaces(next)) return true
    onError("Punkterna kunde inte sparas i webbläsaren.")
    return false
  }

  const savePlace = () => {
    const name = placeName.trim()
    if (!name) return
    const parsedCoords = parseLatLon(lat, lon)
    if ("error" in parsedCoords || parsedCoords.lat === null || parsedCoords.lon === null) {
      onError("Ogiltig koordinat.")
      return
    }
    const { lat: latNum, lon: lonNum } = parsedCoords
    const stored = persistPlaces(
      [
        { name, lat: String(latNum), lon: String(lonNum) },
        ...places.filter((p) => p.name !== name),
      ].slice(0, 12),
    )
    if (!stored) return
    setPlaceName("")
    setSavingPlace(false)
  }

  const removePlace = (name: string) => {
    persistPlaces(places.filter((p) => p.name !== name))
  }

  const selectPlace = (coords: { lat: string; lon: string }) => {
    onChange(coords)
    onClearError()
    setManualCoords(false)
    setEditingPlace(false)
  }

  const clearPlace = () => {
    onChange({ lat: "", lon: "" })
    setManualCoords(false)
    setSavingPlace(false)
    setEditingPlace(true)
  }

  return (
    <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          {legend} <span className="font-normal text-text-faint">(valfritt)</span>
        </legend>

        {hasCoords && !editingPlace ? (
          <div className="flex items-center justify-between gap-2 rounded border border-field-border bg-surface-2 px-3 py-2">
            <span className="truncate font-mono text-xs text-text-muted">
              {lat}, {lon}
            </span>
            <span className="flex shrink-0 items-center gap-3 text-xs">
              <button type="button" onClick={() => setEditingPlace(true)} className="text-text-muted hover:text-text">
                Ändra
              </button>
              <button type="button" onClick={clearPlace} className="text-text-faint hover:text-text">
                Rensa
              </button>
            </span>
          </div>
        ) : (
          <>
            {GOOGLE_MAPS_API_KEY ? (
              <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
                <PlaceSearch onPick={selectPlace} />
              </APIProvider>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <CurrentLocationButton
                label="Min position"
                size="sm"
                className="h-10"
                onLocate={({ latitude, longitude }) => selectPlace({ lat: latitude.toFixed(6), lon: longitude.toFixed(6) })}
              />
              <button
                type="button"
                onClick={() => setManualCoords((value) => !value)}
                className="h-10 rounded border border-field-border px-3 text-text-muted hover:text-text"
              >
                {manualCoords ? "Dölj koordinater" : "Ange koordinater"}
              </button>
              {places.map((place) => (
                <span
                  key={place.name}
                  className="inline-flex h-10 items-center gap-1 rounded border border-field-border bg-surface-2 py-1 pl-2 pr-1 text-xs"
                >
                  <button type="button" onClick={() => selectPlace(place)} className="font-medium text-text hover:text-accent">
                    {place.name}
                  </button>
                  <button type="button" onClick={() => removePlace(place.name)} aria-label={`Ta bort ${place.name}`} className="text-text-faint hover:text-text">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            {manualCoords ? (
              <div className="flex flex-wrap items-start gap-2">
                <input
                  inputMode="decimal"
                  value={lat}
                  onChange={(event) => onChange({ lat: event.target.value, lon })}
                  placeholder="Latitud"
                  className="h-10 min-w-0 flex-1 basis-28 rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
                <input
                  inputMode="decimal"
                  value={lon}
                  onChange={(event) => onChange({ lat, lon: event.target.value })}
                  placeholder="Longitud"
                  className="h-10 min-w-0 flex-1 basis-28 rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                />
              </div>
            ) : null}

            {hasCoords ? (
              <button type="button" onClick={() => setEditingPlace(false)} className="self-start text-sm text-text-muted hover:text-text">
                Klar med position
              </button>
            ) : null}
          </>
        )}

        {hasCoords && !savingPlace ? (
          <button
            type="button"
            onClick={() => setSavingPlace(true)}
            className="self-start rounded border border-field-border px-3 py-1.5 text-sm text-text-muted hover:text-text"
          >
            Spara som punkt
          </button>
        ) : null}

        {savingPlace ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={placeName}
              onChange={(event) => setPlaceName(event.target.value)}
              placeholder="Namnge punkten"
              className="h-9 min-w-0 flex-1 basis-40 rounded border border-field-border bg-surface px-3 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={savePlace}
              disabled={!placeName.trim()}
              className="h-9 shrink-0 rounded border border-field-border px-3 text-sm text-text-muted hover:text-text disabled:text-text-faint"
            >
              Spara punkt
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaceName("")
                setSavingPlace(false)
              }}
              className="text-sm text-text-muted hover:text-text"
            >
              Avbryt
            </button>
          </div>
        ) : null}
    </fieldset>
  )
}
