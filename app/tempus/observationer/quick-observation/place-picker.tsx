import { useEffect, useRef, useState } from "react"
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps"
import { CurrentLocationButton } from "@/app/components/ui/CurrentLocationButton"
import { GOOGLE_MAPS_API_KEY } from "@/app/lib/config"
import { parseLatLon } from "@/app/tempus/formatters"
import { X } from "lucide-react"

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

export function PlacePicker({
  lat,
  lon,
  onChange,
  onClearError,
  onError,
}: {
  lat: string
  lon: string
  onChange: (coords: { lat: string; lon: string }) => void
  onClearError: () => void
  onError: (message: string) => void
}) {
  const [places, setPlaces] = useState<SavedPlace[]>([])
  const [placeName, setPlaceName] = useState("")
  const [manualCoords, setManualCoords] = useState(false)

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
    const parsedCoords = parseLatLon(lat, lon)
    if ("error" in parsedCoords || parsedCoords.lat === null || parsedCoords.lon === null) {
      onError("Ogiltig koordinat.")
      return
    }
    const { lat: latNum, lon: lonNum } = parsedCoords
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

  return (
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
              onClick={() => onChange({ lat: "", lon: "" })}
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
                onChange({ lat: nextLat, lon: nextLon })
                onClearError()
              }}
            />
          </APIProvider>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CurrentLocationButton
            size="sm"
            className="h-9"
            onLocate={({ latitude, longitude }) => {
              onChange({ lat: latitude.toFixed(6), lon: longitude.toFixed(6) })
              onClearError()
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
                      onChange({ lat: place.lat, lon: place.lon })
                      onClearError()
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
                    <X size={12} />
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
  )
}
