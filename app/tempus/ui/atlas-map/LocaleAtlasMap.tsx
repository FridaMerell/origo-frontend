"use client"

import { type ComponentType, useEffect, useMemo, useRef, useState } from "react"
import turfArea from "@turf/area"
import turfBooleanPointInPolygon from "@turf/boolean-point-in-polygon"
import turfBuffer from "@turf/buffer"
import type { Geometry, MultiPolygon, Polygon } from "geojson"
import type { TempusLocale } from "@/app/lib/dal"
import { getLocaleLandCoverFetch, type LandCoverMapFeature, type LocaleLandCoverFetch } from "@/app/lib/land-cover"
import { formatHistoricArea } from "@/app/lib/units"
import { Compass } from "./Compass"
import { JordebokRasterTextures, type RasterPolygonFeature } from "./JordebokRasterTextures"
import { LayerPanel, type AtlasLayers } from "./LayerPanel"
import { landLabel, origoLandLabel, ORIGO_KIND_FILL, ORIGO_TEXTURE_KINDS, origoTextureKind, rasterTextureKind } from "./land-cover-kinds"
import { LinearFeatures } from "./LinearFeatures"
import { ObservationLabels } from "./ObservationLabels"
import { ScaleBar } from "./ScaleBar"
import { INVISIBLE_HIT_TESTABLE_OPACITY, atlasStyle } from "./style"
import { ZoomControl } from "./ZoomControl"

export type AtlasPoint = { id?: string | number; coordinates: readonly [number, number]; label?: string }
type AreaSelection = { label: string; values: ReturnType<typeof formatHistoricArea>; wetland?: string }
const WETLAND_HIGHLIGHT_LAYER = "origo-wetland-highlight"
const WETLAND_OUTLINE_LAYER = "origo-wetland-outline"
const JORDEBOK_INK = "#8f3509"
// 0.2 m: just enough to close typical sub-metre digitizing gaps between
// adjacent parcels without the overlap itself becoming visible. The earlier
// 3 m value was a real-world distance, not a screen distance — at normal
// viewing zoom it was wide enough to visibly eat into a neighbouring,
// differently classified parcel (e.g. a field overlapping into forest),
// which is a much worse artifact than the hairline gap it was meant to fix.
const LAND_COVER_BUFFER_KM = 0.0002
// How often to re-poll the background land-cover-fetch job while it's still
// "missing"/"pending"/"running" (see getLocaleLandCoverFetch's own comment).
const LAND_COVER_FETCH_POLL_MS = 4000
// Screen-space click tolerance for selecting an observation point (see the
// "click" handler below for why this is tested directly against `points`
// instead of via MapLibre's own hit-testing).
const POINT_HIT_RADIUS_PX = 16

function boundsForGeometry(geometry: Geometry) {
  const pairs = geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.type === "MultiPolygon" ? geometry.coordinates.flat(2) : []
  const lngs = pairs.map((point) => point[0])
  const lats = pairs.map((point) => point[1])
  return lngs.length ? [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]] as [[number, number], [number, number]] : null
}

// A fixed, jordebok-style rendering of one Locale. All land-cover comes from
// exactly one call — land-cover/fetch/ — which already returns the Locale's
// bounding box padded 5 km in every direction as a single, unbroken dataset
// (see land-cover-fetch-handoff.md). There is no second, locale-exact
// endpoint layered on top of it: two independent fetches of overlapping
// ground drew the same parcels twice, with visible seams wherever they
// disagreed. One call in, one continuous drawing out — no merging, no
// clipping between sources needed at all.
export type LocaleAtlasMapProps = {
  locale: TempusLocale
  points: readonly AtlasPoint[]
  selectedPoint: AtlasPoint | null
  onPointClick: (point: AtlasPoint) => void
  CompassComponent?: ComponentType
}

export function LocaleAtlasMap({ locale, points, selectedPoint, onPointClick, CompassComponent = Compass }: LocaleAtlasMapProps) {
  const node = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<import("maplibre-gl").Map | null>(null)
  const onPointClickRef = useRef(onPointClick)
  const pointLookup = useRef(new Map<string, AtlasPoint>())
  const bufferedLandCoverRef = useRef<readonly LandCoverMapFeature[]>([])
  const [metersPerPixel, setMetersPerPixel] = useState(1)
  const [layers, setLayers] = useState<AtlasLayers>({ wetland: false })
  const [area, setArea] = useState<AreaSelection | null>(null)
  const [mapReady, setMapReady] = useState(0)
  const [mapInstance, setMapInstance] = useState<import("maplibre-gl").Map | null>(null)
  const [landCoverFetch, setLandCoverFetch] = useState<LocaleLandCoverFetch | null>(null)
  // Distinct from `landCoverFetch.status === "failed"` (a backend-reported
  // job failure, with its own `error` message) — this is a request-level
  // failure (network error, or a genuine 404 on the Locale itself) hitting
  // the endpoint at all, which the backend can't report a `status` for.
  const [landCoverFetchRequestError, setLandCoverFetchRequestError] = useState("")
  const rawLandCover = landCoverFetch?.status === "succeeded" ? landCoverFetch.land_cover.features : []
  const landCoverStatus = landCoverFetchRequestError
    ? landCoverFetchRequestError
    : !landCoverFetch || landCoverFetch.status === "succeeded" ? ""
      : landCoverFetch.status === "failed" ? landCoverFetch.error
        : "Hämtar marktäcke…"
  // Adjacent Lantmäteriet parcels rarely share an exact coincident edge —
  // sub-meter gaps between independently digitized boundaries are normal —
  // which left a thin pale seam wherever two differently classified parcels
  // met. A tiny outward buffer closes that gap (each side overlaps a hair
  // into the other) and its circular joins soften sharp corners as a side
  // effect. Both the map's own solid fill layer and the canvas texture below
  // read this buffered geometry, so their edges always agree with each other.
  const bufferedLandCover = useMemo<readonly LandCoverMapFeature[]>(() => rawLandCover.flatMap((feature) => {
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") return []
    try {
      const buffered = turfBuffer(
        { type: "Feature", properties: {}, geometry: feature.geometry as unknown as Polygon | MultiPolygon },
        LAND_COVER_BUFFER_KM,
        { units: "kilometers", steps: 4 },
      )
      if (!buffered) return [feature]
      return [{ ...feature, geometry: buffered.geometry as unknown as LandCoverMapFeature["geometry"] }]
    } catch {
      // A degenerate/self-intersecting source polygon can make turfBuffer
      // throw outright. Fall back to the unbuffered feature instead of
      // taking down this whole computation (and every layer with it).
      return [feature]
    }
  }), [rawLandCover])
  const rasterPolygons = useMemo<readonly RasterPolygonFeature[]>(() => bufferedLandCover.flatMap((feature, index) => {
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") return []
    const kind = rasterTextureKind(feature)
    if (!kind) return []
    return [{
      id: String(feature.feature_id ?? index),
      kind,
      geometry: feature.geometry as unknown as RasterPolygonFeature["geometry"],
    }]
  }), [bufferedLandCover])
  // Always the current value for the click handler below (defined once, at
  // map "load" time, so it can't just close over bufferedLandCover directly).
  bufferedLandCoverRef.current = bufferedLandCover

  useEffect(() => { onPointClickRef.current = onPointClick }, [onPointClick])

  useEffect(() => {
    let disposed = false
    let map: import("maplibre-gl").Map | null = null
    void import("maplibre-gl").then(({ default: maplibregl }) => {
      if (disposed || !node.current) return
      map = new maplibregl.Map({
        container: node.current,
        style: atlasStyle,
        center: [15.0, 62.0],
        zoom: 4.3,
        minZoom: 3,
        maxZoom: 19,
        attributionControl: false,
        // Fixed view of one Locale — no panning or free interaction away
        // from it. ZoomControl's buttons are the only thing that moves the
        // camera after fitBounds below.
        dragPan: false,
        dragRotate: false,
        scrollZoom: false,
        boxZoom: false,
        doubleClickZoom: false,
        keyboard: false,
        touchZoomRotate: false,
      })
      mapRef.current = map
      setMapInstance(map)
      map.on("load", () => {
        if (!map || disposed) return
        const geometry = locale.geometry as Geometry | null
        const bounds = geometry ? boundsForGeometry(geometry) : null
        if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 16, animate: false })
        if (geometry) {
          map.addSource("locale-boundary", { type: "geojson", data: { type: "Feature", properties: {}, geometry } })
          map.addLayer({ id: "locale-boundary", type: "line", source: "locale-boundary", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": JORDEBOK_INK, "line-width": 1.8, "line-dasharray": [1.2, 1.4] } })
        }
        map.on("click", (event) => {
          if (!map) return
          // MapLibre's queryRenderedFeatures can't hit-test observation
          // points here: this style has no `glyphs` server configured (see
          // ObservationLabels' comment on why the visible labels are plain
          // HTML instead), so a text-field symbol layer never gets shaped
          // glyphs and never produces a queryable feature at all — a
          // previous "locale-observation-points" layer relied on exactly
          // that and could never actually be clicked. Testing screen-space
          // distance directly against `points` — the same data
          // ObservationLabels itself projects — sidesteps needing a
          // rendered/hit-testable layer entirely.
          let closest: { point: AtlasPoint; distance: number } | null = null
          for (const point of pointLookup.current.values()) {
            const projected = map.project([point.coordinates[0], point.coordinates[1]])
            const distance = Math.hypot(projected.x - event.point.x, projected.y - event.point.y)
            if (distance <= POINT_HIT_RADIUS_PX && (!closest || distance < closest.distance)) closest = { point, distance }
          }
          if (closest) { onPointClickRef.current(closest.point); return }
          // Test directly against the same bufferedLandCover array the canvas
          // texture is drawn from, instead of querying MapLibre's rendered
          // origo-texture-* layers — those turned out to sometimes disagree
          // with what the canvas actually painted. Reading the same data both
          // draw from directly removes any chance of that divergence. A click
          // outside all origo-land-cover coverage simply finds nothing.
          const clickPoint: [number, number] = [event.lngLat.lng, event.lngLat.lat]
          const origoMatches = bufferedLandCoverRef.current.filter((candidate) => {
            if (candidate.geometry.type !== "Polygon" && candidate.geometry.type !== "MultiPolygon") return false
            try {
              return turfBooleanPointInPolygon(clickPoint, candidate.geometry as unknown as Polygon | MultiPolygon)
            } catch {
              return false
            }
          })
          if (!origoMatches.length) { setArea(null); return }
          // A point can genuinely carry both a land-cover classification and,
          // independently, a wetland one (e.g. wooded AND wet ground) — the
          // point-lookup endpoint's own land_cover/wetland split reflects
          // that. Surface the wetland match on its own line regardless of
          // which happened to come first in the array, rather than letting
          // it silently lose to whatever else matched at that pixel — the
          // rendered wetland highlight already sits visually on top for the
          // same reason.
          const wetlandMatch = origoMatches.find((candidate) => origoTextureKind(candidate) === "wetland")
          const primaryMatch = origoMatches.find((candidate) => origoTextureKind(candidate) !== "wetland") ?? origoMatches[0]!
          if (primaryMatch.geometry.type !== "Polygon" && primaryMatch.geometry.type !== "MultiPolygon") return
          setArea({
            label: origoLandLabel(primaryMatch),
            values: formatHistoricArea(turfArea({ type: "Feature", properties: {}, geometry: primaryMatch.geometry as unknown as Geometry })),
            wetland: wetlandMatch && wetlandMatch !== primaryMatch ? landLabel(wetlandMatch.properties) : undefined,
          })
        })
        const updateScale = () => setMetersPerPixel((40_075_016.686 * Math.cos((map!.getCenter().lat * Math.PI) / 180)) / (512 * 2 ** map!.getZoom()))
        map.on("move", updateScale)
        updateScale()
        setMapReady((value) => value + 1)
      })
    })
    return () => { disposed = true; map?.remove(); mapRef.current = null; setMapInstance(null) }
  }, [locale.geometry, locale.id])

  useEffect(() => {
    if (!mapRef.current?.isStyleLoaded()) return
    pointLookup.current = new Map(points.map((point, index) => [String(point.id ?? index), point]))
  }, [mapReady, points])

  // Source and layers are created exactly once per map instance (guarded by
  // the getSource check, since mapReady can bump for other reasons) — only
  // the data underneath them changes afterwards, in the effect below. That
  // avoids tearing down and re-adding the source plus all fill/line layers
  // on every land-cover change, which is a heavy DOM/GL operation for what
  // is really just new GeoJSON data.
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded() || map.getSource("origo-land-cover")) return
    map.addSource("origo-land-cover", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
    // beforeId keeps every dynamically-added fill layer under the locale
    // boundary line (added earlier, in "load", when the locale has a
    // geometry) and the observation-point symbols — without it MapLibre
    // appends new layers at the very top, painting the land-cover fill over
    // both. Falls back to undefined (append on top) on the rare locale with
    // no geometry, where "locale-boundary" was never added.
    const beforeId = map.getLayer("locale-boundary") ? "locale-boundary" : undefined
    for (const kind of ORIGO_TEXTURE_KINDS) {
      // Every kind gets its own real, visible fill from origo-land-cover — it
      // is the map's only source of land-cover colour. Wetland stays an
      // invisible placeholder here: it already has its own dedicated,
      // toggle-only highlight (WETLAND_HIGHLIGHT_LAYER) rather than an
      // always-on base tint.
      const paint = ORIGO_KIND_FILL[kind] ?? { "fill-opacity": INVISIBLE_HIT_TESTABLE_OPACITY }
      map.addLayer({
        id: `origo-texture-${kind}`,
        type: "fill",
        source: "origo-land-cover",
        filter: ["==", ["get", "texture_kind"], kind],
        paint,
      }, beforeId)
    }
    // Initial opacity is irrelevant here — the layers.wetland effect below
    // runs on every mount too and immediately sets the real value, same as
    // it does on every later toggle.
    map.addLayer({
      id: WETLAND_HIGHLIGHT_LAYER,
      type: "fill",
      source: "origo-land-cover",
      filter: ["==", ["get", "texture_kind"], "wetland"],
      paint: { "fill-color": "#2f6f5e", "fill-opacity": 0 },
    }, beforeId)
    map.addLayer({
      id: WETLAND_OUTLINE_LAYER,
      type: "line",
      source: "origo-land-cover",
      filter: ["==", ["get", "texture_kind"], "wetland"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#1f4f42", "line-width": 1.2, "line-dasharray": [2, 1.5], "line-opacity": 0 },
    }, beforeId)
  }, [mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const source = map.getSource("origo-land-cover") as import("maplibre-gl").GeoJSONSource | undefined
    if (!source) return
    source.setData({
      type: "FeatureCollection",
      features: bufferedLandCover.map((feature, index) => ({
        type: "Feature" as const,
        properties: { ...feature.properties, texture_kind: origoTextureKind(feature), id: feature.feature_id ?? index },
        geometry: feature.geometry as unknown as Geometry,
      })),
    })
  }, [mapReady, bufferedLandCover])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    if (map.getLayer(WETLAND_HIGHLIGHT_LAYER)) map.setPaintProperty(WETLAND_HIGHLIGHT_LAYER, "fill-opacity", layers.wetland ? 0.42 : 0)
    if (map.getLayer(WETLAND_OUTLINE_LAYER)) map.setPaintProperty(WETLAND_OUTLINE_LAYER, "line-opacity", layers.wetland ? 0.85 : 0)
  }, [layers.wetland, mapReady])

  // The initial fitBounds (in "load", above) fits tight to the locale's own
  // shape so the very first paint isn't a blank, zoomed-out world view while
  // the background fetch is still running. Once land-cover/fetch/ has
  // actually succeeded, keep the framing on the Locale itself. The background
  // coverage deliberately extends beyond it, but using that padded extent for
  // fitBounds made the actual place appear unnecessarily small on first view.
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded() || landCoverFetch?.status !== "succeeded") return
    const geometry = locale.geometry as Geometry | null
    const localeBounds = geometry ? boundsForGeometry(geometry) : null
    const surroundingBounds = boundsForGeometry(landCoverFetch.geometry as unknown as Geometry)
    const bounds = localeBounds ?? surroundingBounds
    if (!bounds) return
    map.fitBounds(bounds, { padding: 48, maxZoom: 16, animate: true, duration: 400 })
  }, [locale.geometry, landCoverFetch, mapReady])

  // The only land-cover call this atlas makes. Runs continuously (not
  // gated behind a toggle — there is nothing else to fall back to now),
  // polling per land-cover-fetch-handoff.md: every few seconds while
  // "missing"/"pending"/"running", stopping once "succeeded" or "failed".
  useEffect(() => {
    const controller = new AbortController()
    let pollTimer: number | null = null
    const poll = () => {
      void getLocaleLandCoverFetch(locale.id, controller.signal).then(
        (response) => {
          if (controller.signal.aborted) return
          setLandCoverFetch(response)
          setLandCoverFetchRequestError("")
          if (response.status === "missing" || response.status === "pending" || response.status === "running") {
            pollTimer = window.setTimeout(poll, LAND_COVER_FETCH_POLL_MS)
          }
        },
        (error: unknown) => {
          if (controller.signal.aborted) return
          // A genuine request failure (network error, or a 404 if the
          // Locale itself is gone) — not the backend's own reported
          // `status: "failed"`, which already has its own `error` message
          // shown above. Stops polling: nothing here resolves on its own
          // without the user re-saving the Locale or reloading the page.
          console.error(`Kunde inte hämta marktäcke för lokal ${locale.id}:`, error)
          setLandCoverFetchRequestError("Marktäcket kunde inte hämtas just nu.")
        },
      )
    }
    poll()
    return () => { controller.abort(); if (pollTimer !== null) window.clearTimeout(pollTimer) }
  }, [locale.id])

  return <div className="relative h-full min-h-0 overflow-hidden bg-[#fbf8f0]">
    <div ref={node} className="h-full w-full" aria-label={`Karta över ${locale.name}`} />
    {mapInstance ? <JordebokRasterTextures map={mapInstance} features={rasterPolygons} /> : null}
    {mapInstance && landCoverFetch?.status === "succeeded" ? <LinearFeatures map={mapInstance} hydrography={landCoverFetch.hydrography?.features ?? []} roads={landCoverFetch.roads?.features ?? []} /> : null}
    {mapInstance ? <ObservationLabels map={mapInstance} points={points} selectedPoint={selectedPoint} /> : null}
    {mapInstance ? <ZoomControl map={mapInstance} /> : null}
    <LayerPanel layers={layers} onChange={setLayers} />
    <CompassComponent />
    <ScaleBar metersPerPixel={metersPerPixel} />
    {selectedPoint ? <span className="sr-only">Vald observation: {selectedPoint.label}</span> : null}
    {landCoverStatus ? <p className="absolute bottom-16 right-5 z-20 max-w-60 rounded border border-[#4a3526]/50 bg-[#fbf8f0]/90 px-2 py-1 text-xs text-[#4a3526]" role="status">{landCoverStatus}</p> : null}
    {area ? <aside className="absolute left-4 top-16 z-20 max-w-72 border border-[#4a3526]/70 bg-[#fbf8f0]/95 p-3 text-xs text-[#4a3526] shadow-sm" aria-live="polite"><p className="font-display text-sm italic capitalize">{area.label}</p>{area.wetland ? <p className="mt-1 capitalize">Sankmark: {area.wetland}</p> : null}<p className="mt-1">{area.values.hectares} · {area.values.tunnland}</p><p className="mt-1 text-[#665744]">{area.values.markland} · {area.values.oresland}<br />{area.values.ortugsland} · {area.values.penningland}</p></aside> : null}
  </div>
}
