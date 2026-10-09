"use client"

import { type ComponentType, useEffect, useMemo, useRef, useState } from "react"
import turfArea from "@turf/area"
import turfBooleanPointInPolygon from "@turf/boolean-point-in-polygon"
import type { Geometry, MultiPolygon, Polygon } from "geojson"
import type { TempusLocale } from "@/app/lib/dal"
import { getLocaleLandCoverFetch, type LandCoverMapFeature, type LocaleLandCoverFetch } from "@/app/lib/land-cover"
import { formatHistoricArea } from "@/app/lib/units"
import { Compass } from "./Compass"
import { JordebokRasterTextures, type RasterPolygonFeature } from "./JordebokRasterTextures"
import { LayerPanel, type AtlasLayers } from "./LayerPanel"
import { WATER_FILL_COLOR, landLabel, origoLandLabel, ORIGO_KIND_FILL, ORIGO_TEXTURE_KINDS, origoTextureKind, rasterTextureKind } from "./land-cover-kinds"
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
// How often to re-poll the background land-cover-fetch job while it's still
// "missing"/"pending"/"running" (see getLocaleLandCoverFetch's own comment).
const LAND_COVER_FETCH_POLL_MS = 4000
// Screen-space click tolerance for selecting an observation point (see the
// "click" handler below for why this is tested directly against `points`
// instead of via MapLibre's own hit-testing).
const POINT_HIT_RADIUS_PX = 16
// Kartan är en fast vy över en plats, inte en världskarta: längre ut än så här
// finns inget att se. Utzoomningen stoppas MAX_ZOOM_OUT_LEVELS nivåer under den
// zoom där platsen precis ryms (fitBounds), aldrig under MIN_ZOOM_FLOOR.
const MIN_ZOOM_FLOOR = 3
const MAX_ZOOM_OUT_LEVELS = 1

// Stabil tom lista, så att "ingen data än" inte ger en ny array (och därmed omräkning av allt som härleds) vid varje render.
const NO_FEATURES: readonly LandCoverMapFeature[] = []
// Samma sak för vatten och vägar: en ny tom array vid varje rendering skulle få
// LinearFeatures att rita om dukarna i onödan.
const NO_LINEAR_FEATURES: readonly never[] = []
const EARTH_CIRCUMFERENCE_M = 40_075_016.686
const MAP_TILE_SIZE_PX = 512

function boundsForGeometry(geometry: Geometry) {
  const positions =
    geometry.type === "Polygon" ? geometry.coordinates.flat()
      : geometry.type === "MultiPolygon" ? geometry.coordinates.flat(2)
        : []
  if (positions.length === 0) return null
  const lngs = positions.map((position) => position[0])
  const lats = positions.map((position) => position[1])
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ] as [[number, number], [number, number]]
}

function isPolygonal(feature: LandCoverMapFeature) {
  return feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon"
}

function metersPerPixelAt(map: import("maplibre-gl").Map) {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((map.getCenter().lat * Math.PI) / 180)) / (MAP_TILE_SIZE_PX * 2 ** map.getZoom())
}

/** Närmaste observationspunkt inom klickradien, eller null. */
function findClosestPoint(map: import("maplibre-gl").Map, points: Iterable<AtlasPoint>, click: { x: number; y: number }) {
  let closest: { point: AtlasPoint; distance: number } | null = null
  for (const point of points) {
    const projected = map.project([point.coordinates[0], point.coordinates[1]])
    const distance = Math.hypot(projected.x - click.x, projected.y - click.y)
    if (distance <= POINT_HIT_RADIUS_PX && (!closest || distance < closest.distance)) closest = { point, distance }
  }
  return closest?.point ?? null
}

/**
 * Markslaget vid en punkt. En punkt kan vara både t.ex. skog och sankmark, så sankmarken
 * redovisas separat oavsett vilken som råkade komma först i listan.
 */
function describeAreaAt(features: readonly LandCoverMapFeature[], position: [number, number]): AreaSelection | null {
  const matches = features.filter((candidate) => {
    if (!isPolygonal(candidate)) return false
    try {
      return turfBooleanPointInPolygon(position, candidate.geometry as unknown as Polygon | MultiPolygon)
    } catch {
      return false
    }
  })
  if (matches.length === 0) return null

  const wetlandMatch = matches.find((candidate) => origoTextureKind(candidate) === "wetland")
  const primaryMatch = matches.find((candidate) => origoTextureKind(candidate) !== "wetland") ?? matches[0]
  return {
    label: origoLandLabel(primaryMatch),
    values: formatHistoricArea(turfArea({ type: "Feature", properties: {}, geometry: primaryMatch.geometry as unknown as Geometry })),
    wetland: wetlandMatch && wetlandMatch !== primaryMatch ? landLabel(wetlandMatch.properties) : undefined,
  }
}

function AreaPanel({ area }: { area: AreaSelection }) {
  const { values } = area
  return (
    <aside className="absolute left-4 top-16 z-20 max-w-72 border border-[#4a3526]/70 bg-[#fbf8f0]/95 p-3 text-xs text-[#4a3526] shadow-sm" aria-live="polite">
      <p className="font-display text-sm italic capitalize">{area.label}</p>
      {area.wetland ? <p className="mt-1 capitalize">Sankmark: {area.wetland}</p> : null}
      <p className="mt-1">{values.hectares} · {values.tunnland}</p>
      <p className="mt-1 text-[#665744]">
        {values.markland} · {values.oresland}
        <br />
        {values.ortugsland} · {values.penningland}
      </p>
    </aside>
  )
}

// Havet får samma handritade vattenmönster som sjöarna (LinearFeatures). MapLibres
// fill-pattern ersätter fyllnadsfärgen, så bilden läggs på en botten av
// vattenfärgen innan den registreras; fram till dess syns den platta färgen.
const SEA_PATTERN_IMAGE = "origo-sea-pattern"
const SEA_PATTERN_SRC = "/tempus/map-textures/historic-water.png"
// Samma täthet och styrka som sjöarnas mönster: bilden visas i halv storlek.
const SEA_PATTERN_PIXEL_RATIO = 2
const SEA_PATTERN_ALPHA = 0.6

function addSeaPattern(map: import("maplibre-gl").Map) {
  const image = new Image()
  image.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")
    if (!context) return
    context.fillStyle = WATER_FILL_COLOR
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.globalAlpha = SEA_PATTERN_ALPHA
    context.drawImage(image, 0, 0)
    try {
      if (!map.hasImage(SEA_PATTERN_IMAGE)) map.addImage(SEA_PATTERN_IMAGE, context.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio: SEA_PATTERN_PIXEL_RATIO })
      if (map.getLayer("origo-texture-water")) map.setPaintProperty("origo-texture-water", "fill-pattern", SEA_PATTERN_IMAGE)
    } catch {
      // Kartan hann tas bort innan bilden var klar.
    }
  }
  image.src = SEA_PATTERN_SRC
}

// Källan och lagren för marktäcket skapas en enda gång per karta, i kartans
// "load"-händelse. De skapades tidigare i en effekt som avbröt sig tyst om
// map.isStyleLoaded() var falskt — vilket den är just efter att gränsens
// geojson-källa har lagts till — och effekten kördes aldrig om, så lagren (och
// därmed alla markfärger och sankmarkslagret) fanns aldrig.
function addLandCoverLayers(map: import("maplibre-gl").Map) {
  if (map.getSource("origo-land-cover")) return
  map.addSource("origo-land-cover", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
  // beforeId keeps every fill layer under the locale boundary line (added just
  // before this, in "load", when the locale has a geometry) — without it
  // MapLibre appends new layers at the very top, painting the land-cover fill
  // over the boundary. Falls back to undefined (append on top) on the rare
  // locale with no geometry, where "locale-boundary" was never added.
  const beforeId = map.getLayer("locale-boundary") ? "locale-boundary" : undefined
  for (const kind of ORIGO_TEXTURE_KINDS) {
    // Every kind gets its own real, visible fill from origo-land-cover — it is
    // the map's only source of land-cover colour. Wetland stays an invisible
    // placeholder here: it already has its own dedicated, toggle-only highlight
    // (WETLAND_HIGHLIGHT_LAYER) rather than an always-on base tint.
    const paint = ORIGO_KIND_FILL[kind] ?? { "fill-opacity": INVISIBLE_HIT_TESTABLE_OPACITY }
    map.addLayer({
      id: `origo-texture-${kind}`,
      type: "fill",
      source: "origo-land-cover",
      filter: ["==", ["get", "texture_kind"], kind],
      // No antialiasing: with it every fill blends with the paper along its own
      // edge, which shows as a pale seam where two parcels meet.
      paint: { ...paint, "fill-antialias": false },
    }, beforeId)
  }
  addSeaPattern(map)
  // Initial opacity is irrelevant here — the layers.wetland effect runs right
  // after and sets the real value, same as it does on every later toggle.
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
  const landCoverRef = useRef<readonly LandCoverMapFeature[]>([])
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
  const rawLandCover = landCoverFetch?.status === "succeeded" ? landCoverFetch.land_cover.features : NO_FEATURES
  const landCoverStatus = landCoverFetchRequestError
    ? landCoverFetchRequestError
    : !landCoverFetch || landCoverFetch.status === "succeeded" ? ""
      : landCoverFetch.status === "failed" ? landCoverFetch.error
        : "Hämtar marktäcke…"
  // Adjacent Lantmäteriet parcels rarely share an exact coincident edge —
  // sub-meter gaps between independently digitized boundaries are normal —
  // which left a thin pale seam wherever two differently classified parcels
  // met. That used to be closed by buffering every parcel outwards 0.2 m
  // (turf-buffer), synchronously while rendering. The cost of that grows much
  // faster than linearly with a parcel's vertex count (measured: ~5 ms at 500
  // vertices, ~35 ms at 2 000, ~740 ms at 8 000), so a locale with a few large
  // parcels froze the page for seconds. The seam now comes out of how the fills
  // are drawn instead — without antialiasing (see addLandCoverLayers), so
  // neighbouring fills abut rather than each blending with the paper at its
  // edge — and the parcels are used exactly as delivered, by both the map's
  // fill layers and the canvas texture.
  const polygonalLandCover = useMemo<readonly LandCoverMapFeature[]>(() => rawLandCover.filter(isPolygonal), [rawLandCover])
  const rasterPolygons = useMemo<readonly RasterPolygonFeature[]>(() => polygonalLandCover.flatMap((feature, index) => {
    if (!isPolygonal(feature)) return []
    const kind = rasterTextureKind(feature)
    if (!kind) return []
    return [{
      id: String(feature.feature_id ?? index),
      kind,
      geometry: feature.geometry as unknown as RasterPolygonFeature["geometry"],
    }]
  }), [polygonalLandCover])
  // Alltid aktuellt värde åt klick-hanteraren, som skapas en gång vid kartans "load"
  // och därför inte kan stänga över polygonalLandCover direkt.
  useEffect(() => { landCoverRef.current = polygonalLandCover }, [polygonalLandCover])

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
        if (bounds) {
          map.fitBounds(bounds, { padding: 48, maxZoom: 16, animate: false })
          map.setMinZoom(Math.max(MIN_ZOOM_FLOOR, map.getZoom() - MAX_ZOOM_OUT_LEVELS))
        }
        if (geometry) {
          map.addSource("locale-boundary", { type: "geojson", data: { type: "Feature", properties: {}, geometry } })
          map.addLayer({ id: "locale-boundary", type: "line", source: "locale-boundary", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": JORDEBOK_INK, "line-width": 2.2, "line-dasharray": [1.2, 1.4] } })
        }
        addLandCoverLayers(map)
        map.on("click", (event) => {
          if (!map) return
          // Observationspunkterna testas direkt mot skärmavstånd: stilen saknar glyphs-server,
          // så ett symbollager med text skulle aldrig ge några träffbara features (se ObservationLabels).
          const clickedPoint = findClosestPoint(map, pointLookup.current.values(), event.point)
          if (clickedPoint) {
            onPointClickRef.current(clickedPoint)
            return
          }
          // Markslaget slås upp mot samma data som texturen ritas från. MapLibres egna
          // lager kunde avvika från det som faktiskt målades.
          setArea(describeAreaAt(landCoverRef.current, [event.lngLat.lng, event.lngLat.lat]))
        })
        const updateScale = () => setMetersPerPixel(metersPerPixelAt(map!))
        map.on("move", updateScale)
        updateScale()
        setMapReady((value) => value + 1)
      })
    })
    return () => { disposed = true; map?.remove(); mapRef.current = null; setMapInstance(null) }
  }, [locale.geometry, locale.id])

  // Ingen kontroll av stilens laddningsläge här: uppslagstabellen är vanlig data,
  // och en effekt som avbryter sig på isStyleLoaded() körs aldrig om.
  useEffect(() => {
    pointLookup.current = new Map(points.map((point, index) => [String(point.id ?? index), point]))
  }, [points])

  // Source and layers exist from "load" (addLandCoverLayers); only the data
  // underneath them changes afterwards, here. That avoids tearing down and
  // re-adding the source plus all fill/line layers on every land-cover change,
  // which is a heavy DOM/GL operation for what is really just new GeoJSON data.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource("origo-land-cover") as import("maplibre-gl").GeoJSONSource | undefined
    if (!source) return
    source.setData({
      type: "FeatureCollection",
      features: polygonalLandCover.map((feature, index) => ({
        type: "Feature" as const,
        properties: { ...feature.properties, texture_kind: origoTextureKind(feature), id: feature.feature_id ?? index },
        geometry: feature.geometry as unknown as Geometry,
      })),
    })
  }, [mapReady, polygonalLandCover])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
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
    if (!map || mapReady === 0 || landCoverFetch?.status !== "succeeded") return
    const geometry = locale.geometry as Geometry | null
    const localeBounds = geometry ? boundsForGeometry(geometry) : null
    const surroundingBounds = boundsForGeometry(landCoverFetch.geometry as unknown as Geometry)
    const bounds = localeBounds ?? surroundingBounds
    if (!bounds) return
    // Gränsen sätts innan kameran flyttas, så att den nya passningen inte klipps
    // mot den gamla gränsen.
    const fitted = map.cameraForBounds(bounds, { padding: 48, maxZoom: 16 })
    if (fitted?.zoom !== undefined) map.setMinZoom(Math.max(MIN_ZOOM_FLOOR, fitted.zoom - MAX_ZOOM_OUT_LEVELS))
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
    {mapInstance && landCoverFetch?.status === "succeeded" ? <LinearFeatures map={mapInstance} hydrography={landCoverFetch.hydrography?.features ?? NO_LINEAR_FEATURES} roads={landCoverFetch.roads?.features ?? NO_LINEAR_FEATURES} /> : null}
    {mapInstance ? <ObservationLabels map={mapInstance} points={points} selectedPoint={selectedPoint} /> : null}
    {mapInstance ? <ZoomControl map={mapInstance} /> : null}
    <LayerPanel layers={layers} onChange={setLayers} />
    <CompassComponent />
    <ScaleBar metersPerPixel={metersPerPixel} />
    {selectedPoint ? <span className="sr-only">Vald observation: {selectedPoint.label}</span> : null}
    {landCoverStatus ? (
      <p className="absolute bottom-16 right-5 z-20 max-w-60 rounded border border-[#4a3526]/50 bg-[#fbf8f0]/90 px-2 py-1 text-xs text-[#4a3526]" role="status">
        {landCoverStatus}
      </p>
    ) : null}
    {area ? <AreaPanel area={area} /> : null}
  </div>
}
