"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { APIProvider, Map, Marker, Polygon, useApiIsLoaded, useMap, useMapsLibrary } from "@vis.gl/react-google-maps"
import { kinks as turfKinks } from "@turf/turf"
import { GOOGLE_MAPS_API_KEY } from "@/app/lib/config"
import { SearchField } from "@/app/tempus/forms/Fields"
import { openRing, polygonFromPoints } from "@/app/tempus/ui/biotope-map/sweden-map-area-geometry"
import type { GeoJsonPolygonGeometry, GeoJsonPosition } from "@/app/tempus/ui/biotope-map/SwedenMap"

// Free-dragging a corner can cross an edge of the same ring — the map lets
// you draw that (there's no geometric reason to stop the drag itself), but
// a self-intersecting ("bowtie") ring isn't a valid simple polygon: turf
// operations elsewhere in the app assume one, and it would have saved and
// rendered exactly this kind of star-shaped mess. kinks() finds every
// self-intersection point cheaply for a single ring, so this only needs to
// run when the ring actually changes, not per drag frame.
function isSimplePolygon(geometry: GeoJsonPolygonGeometry): boolean {
  try {
    return turfKinks(geometry as never).features.length === 0
  } catch {
    return true
  }
}

const SWEDEN_CENTER = { lat: 62.5, lng: 15.5 }
const SWEDEN_ZOOM = 5
const SEARCH_ZOOM = 17

// A plain, low-key utility basemap — not a pastiche of hand-drawn
// cartography (Google's style JSON can only fill flat vector shapes, it
// can't fake paper texture or illustration). The app's own illustrated
// look already lives elsewhere: saved places render on SwedenMap in
// locales-view.tsx, same as routes do in route-preview.tsx. Every color
// below comes from the current theme's own tokens (not a separately
// guessed palette) so the basemap follows whichever tenant/mode is active.
const FALLBACK = {
  surface: "#FBF8F0",
  surface2: "#E9E2D5",
  border: "#CFC2AE",
  text: "#271B13",
  textMuted: "#655749",
  accent: "#A4410D",
}
type ThemeColors = typeof FALLBACK

function useThemeColors(scopeRef: React.RefObject<HTMLElement | null>) {
  const [colors, setColors] = useState<ThemeColors>(FALLBACK)

  useEffect(() => {
    const scope = scopeRef.current?.closest<HTMLElement>("[data-theme]") ?? document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const read = () => {
      const style = getComputedStyle(scope)
      const get = (name: keyof ThemeColors, cssVar: string) => style.getPropertyValue(cssVar).trim() || FALLBACK[name]
      setColors({
        surface: get("surface", "--surface"),
        surface2: get("surface2", "--surface-2"),
        border: get("border", "--border"),
        text: get("text", "--text"),
        textMuted: get("textMuted", "--text-muted"),
        accent: get("accent", "--accent"),
      })
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(scope, { attributes: true, attributeFilter: ["data-mode", "data-theme"] })
    media.addEventListener("change", read)
    return () => {
      observer.disconnect()
      media.removeEventListener("change", read)
    }
  }, [scopeRef])

  return { colors }
}

function buildMapStyle(colors: ThemeColors): google.maps.MapTypeStyle[] {
  return [
    { elementType: "geometry", stylers: [{ color: colors.surface2 }] },
    { elementType: "labels.text.fill", stylers: [{ color: colors.textMuted }] },
    { elementType: "labels.text.stroke", stylers: [{ color: colors.surface2 }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: colors.surface2 }] },
    { featureType: "landscape.man_made", elementType: "geometry.fill", stylers: [{ color: colors.surface }] },
    { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: colors.border }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: colors.surface }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: colors.border }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: colors.text }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: colors.border }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: colors.border }] },
    { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  ]
}

/** A halo-dot marker icon in the app's accent color — not Google's stock pin. */
function markerIcon(accent: string, surface: string): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="${accent}" fill-opacity="0.22" />
    <circle cx="16" cy="16" r="7" fill="${accent}" stroke="${surface}" stroke-width="3" />
  </svg>`
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 16),
  }
}

function toPosition(point: google.maps.LatLng): GeoJsonPosition {
  return [point.lng(), point.lat()]
}

/** Google's classic Autocomplete input, restricted to Swedish addresses. */
function AddressSearch({
  disabled,
  onPick,
}: {
  disabled: boolean
  onPick: (point: google.maps.LatLngLiteral) => void
}) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  const onPickRef = useRef(onPick)

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    if (!places || !inputRef.current) return
    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: ["geometry"],
      componentRestrictions: { country: "se" },
    })
    const listener = autocomplete.addListener("place_changed", () => {
      const point = autocomplete.getPlace().geometry?.location
      if (!point) return
      onPickRef.current({ lat: point.lat(), lng: point.lng() })
    })
    return () => listener.remove()
  }, [places])

  return (
    <label className="flex items-center gap-2 border-b border-border pb-2 text-text-faint">
      <span className="font-display text-xs italic">Sök</span>
      <SearchField
        ref={inputRef}
        disabled={disabled}
        placeholder="Adress eller ort"
        autoComplete="off"
      />
    </label>
  )
}

/** Pans the enclosing map to a searched address. Must render inside <Map>. */
function MapPanner({ target }: { target: google.maps.LatLngLiteral | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !target) return
    map.panTo(target)
    map.setZoom(SEARCH_ZOOM)
  }, [map, target])
  return null
}

function LocaleMapBody({
  disabled,
  initialValue,
  onChange,
  height,
}: {
  disabled: boolean
  initialValue?: GeoJsonPolygonGeometry | null
  onChange: (geometry: GeoJsonPolygonGeometry | null) => void
  height: number
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { colors } = useThemeColors(rootRef)
  const apiIsLoaded = useApiIsLoaded()
  const mapStyle = useMemo(() => buildMapStyle(colors), [colors])
  const icon = useMemo(
    () => (apiIsLoaded ? markerIcon(colors.accent, colors.surface) : undefined),
    [apiIsLoaded, colors.accent, colors.surface],
  )

  const [points, setPoints] = useState<GeoJsonPosition[]>(() => openRing(initialValue))
  const [searchTarget, setSearchTarget] = useState<google.maps.LatLngLiteral | null>(null)
  const geometry = polygonFromPoints(points)
  // Rendered regardless (so a self-intersecting shape stays visible and
  // draggable to fix), but never handed to onChange — see reportGeometry.
  const selfIntersecting = geometry ? !isSimplePolygon(geometry) : false
  const polygonRef = useRef<google.maps.Polygon | null>(null)

  const reportGeometry = useCallback(
    (next: GeoJsonPosition[]) => {
      const candidate = polygonFromPoints(next)
      onChange(candidate && isSimplePolygon(candidate) ? candidate : null)
    },
    [onChange],
  )

  // The underlying <Polygon> is deliberately NOT given a `paths` prop kept in
  // sync with `points` on every render (a "controlled" polygon) — the
  // library's own vertex-drag listeners re-subscribe whenever that prop's
  // array reference changes (its effect depends on `paths`), and since a
  // fresh array is exactly what we'd hand it after every one of the drag's
  // own onPathsChanged calls, that resubscribe raced the drag itself: the
  // very last `set_at` (releasing the mouse) could land in the gap between
  // the old listener being removed and the new one attaching, so the final
  // position of a dragged corner sometimes never made it into `points`.
  // Instead the polygon owns its paths once drawn; we only ever push a
  // geometry INTO it imperatively (via this ref) for changes that don't
  // originate from the polygon itself — a new point clicked, Ångra, Rensa.
  const syncPoints = useCallback(
    (next: GeoJsonPosition[]) => {
      setPoints(next)
      reportGeometry(next)
      polygonRef.current?.setPaths(next.map(([lon, lat]) => ({ lat, lng: lon })))
    },
    [reportGeometry],
  )

  const onMapClick = useCallback(
    (event: { detail: { latLng: google.maps.LatLngLiteral | null } }) => {
      if (disabled || !event.detail.latLng) return
      const { lat, lng } = event.detail.latLng
      syncPoints([...points, [lng, lat] as GeoJsonPosition])
    },
    [disabled, points, syncPoints],
  )

  // The polygon reporting its own edit back — points already live on the
  // instance, so this only needs to update React state/onChange, never
  // setPaths (see the comment on syncPoints above for why not).
  const onPathsChanged = useCallback(
    (paths: google.maps.LatLng[][]) => {
      const ring = paths[0] ?? []
      const next = ring.map(toPosition)
      setPoints(next)
      reportGeometry(next)
    },
    [reportGeometry],
  )

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <AddressSearch disabled={disabled} onPick={setSearchTarget} />

      <div className="border border-border-strong p-1">
        <div className="overflow-hidden border border-border" style={{ height }}>
          <Map
            defaultCenter={SWEDEN_CENTER}
            defaultZoom={SWEDEN_ZOOM}
            gestureHandling="greedy"
            disableDefaultUI
            zoomControl
            clickableIcons={false}
            styles={mapStyle}
            onClick={onMapClick}
          >
            <MapPanner target={searchTarget} />
            {searchTarget ? <Marker position={searchTarget} icon={icon} /> : null}
            {!geometry
              ? points.map(([lon, lat], index) => (
                  <Marker key={index} position={{ lat, lng: lon }} icon={icon} />
                ))
              : null}
            {geometry ? (
              <Polygon
                ref={polygonRef}
                defaultPaths={points.map(([lon, lat]) => ({ lat, lng: lon }))}
                // Without this, the polygon has no click handler of its own so
                // the library leaves it non-clickable — a mousedown that lands
                // on its fill or a vertex/midpoint handle then falls through
                // to the map underneath instead of being captured here, firing
                // onMapClick and adding a stray extra point right where you
                // meant to just grab and move an existing corner.
                clickable={!disabled}
                editable={!disabled}
                draggable={!disabled}
                strokeColor={selfIntersecting ? "#b3261e" : colors.accent}
                strokeWeight={2}
                fillColor={selfIntersecting ? "#b3261e" : colors.accent}
                fillOpacity={0.22}
                onPathsChanged={onPathsChanged}
              />
            ) : null}
          </Map>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[.14em] text-text-faint">
        <span aria-live="polite">
          {selfIntersecting
            ? "Gränsen korsar sig själv — dra isär hörnen innan du kan spara"
            : geometry
              ? `${points.length} punkter · klar att spara`
              : `${points.length}/3 punkter`}
        </span>
        <div className="flex items-center gap-3 normal-case tracking-normal">
          <button
            type="button"
            disabled={disabled || points.length === 0}
            onClick={() => syncPoints(points.slice(0, -1))}
            className="underline underline-offset-4 hover:text-accent disabled:opacity-40 disabled:no-underline"
          >
            Ångra punkt
          </button>
          <button
            type="button"
            disabled={disabled || points.length === 0}
            onClick={() => syncPoints([])}
            className="underline underline-offset-4 hover:text-danger disabled:opacity-40 disabled:no-underline"
          >
            Rensa
          </button>
        </div>
      </div>

      <p className="font-display text-xs italic leading-5 text-text-faint">
        Sök en adress för att zooma in, klicka sedan ut hörnen för området. Med minst tre hörn går det att dra i punkterna för att finjustera gränsen.
      </p>
    </div>
  )
}

export function LocaleMapEditor({
  disabled = false,
  initialValue,
  onChange,
  height = 420,
}: {
  disabled?: boolean
  initialValue?: GeoJsonPolygonGeometry | null
  onChange: (geometry: GeoJsonPolygonGeometry | null) => void
  height?: number
}) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <p className="rounded border border-border bg-surface-2/40 px-3 py-3 text-xs italic text-text-muted">
        Sätt <code className="not-italic">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> för att rita platser på kartan.
      </p>
    )
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <LocaleMapBody disabled={disabled} initialValue={initialValue} onChange={onChange} height={height} />
    </APIProvider>
  )
}
