"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { area as turfArea, booleanPointInPolygon as turfBooleanPointInPolygon, buffer as turfBuffer } from "@turf/turf"
import type { Feature, GeoJsonProperties, Geometry, MultiPolygon, Polygon } from "geojson"
import type { TempusLocale } from "@/app/lib/dal"
import { getLocaleLandCoverMap, getViewportLandCover, LandCoverLookupError, resolveLandCoverTier, type LandCoverMapFeature } from "@/app/lib/land-cover"
import { formatHistoricArea } from "@/app/lib/units"
import { Compass } from "./Compass"
import { JordebokRasterTextures, type RasterPolygonFeature } from "./JordebokRasterTextures"
import { LayerPanel, type AtlasLayers } from "./LayerPanel"
import { MapStepNavigation } from "./MapStepNavigation"
import { ObservationLabels } from "./ObservationLabels"
import { registerAtlasPatterns } from "./patterns"
import { PlaceLabels } from "./PlaceLabels"
import { PlaceSearch } from "./PlaceSearch"
import { ScaleBar } from "./ScaleBar"
import { ATLAS_INTERACTIVE_LAYERS, HOUSE_LAYERS, INVISIBLE_HIT_TESTABLE_OPACITY, ROAD_LAYERS, atlasStyle } from "./style"

export type AtlasPoint = { id?: string | number; coordinates: readonly [number, number]; label?: string }
type AreaSelection = { label: string; values: ReturnType<typeof formatHistoricArea>; wetland?: string }
const ORIGO_TEXTURE_KINDS = ["agriculture", "coniferous-forest", "deciduous-forest", "mixed-forest", "grass", "wetland", "open", "alvar", "mountains", "general"] as const
const ORIGO_TEXTURE_LAYERS = ORIGO_TEXTURE_KINDS.map((kind) => `origo-texture-${kind}`) as readonly string[]
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
// How far beyond the visible viewport "Marktäcke, vyn" preloads, as a
// fraction of the viewport's own width/height on each side — e.g. 0.6 fetches
// a bbox 2.2x wider/taller than the screen, so panning within that margin
// needs no new request at all.
const VIEWPORT_LAND_COVER_PADDING_FACTOR = 0.6
type OrigoTextureKind = typeof ORIGO_TEXTURE_KINDS[number]

// origo-land-cover (Lantmäteriet) is the map's single source of land-cover
// colour — see the removal of OSM's own landcover fills in style.ts. Forest
// tones reuse the old OSM "wood" gradient and grass reuses OSM's old
// "grass" colour, just so the palette doesn't visibly change; open/alvar/
// mountains/general share a neutral tan since they were never distinctly
// coloured before. Wetland is intentionally absent — it keeps its own
// toggle-only highlight instead of an always-on base tint.
// MapLibre's own paint-property types are awkward to name precisely for a
// small literal table like this (expression arrays vs. plain colour
// strings); `Record<string, unknown>` is enough to keep `any` out of the
// codebase without pretending to model the full style-spec grammar.
const ORIGO_KIND_FILL: Partial<Record<OrigoTextureKind, Record<string, unknown>>> = {
  agriculture: { "fill-color": ["interpolate", ["linear"], ["zoom"], 11, "#eee8c8", 14, "#f2ead0"], "fill-opacity": .72 },
  "coniferous-forest": { "fill-color": ["interpolate", ["linear"], ["zoom"], 6, "#d5d9bd", 12, "#e0e3c9", 16, "#e8e8d5"], "fill-opacity": .9 },
  "mixed-forest": { "fill-color": ["interpolate", ["linear"], ["zoom"], 6, "#d5d9bd", 12, "#e0e3c9", 16, "#e8e8d5"], "fill-opacity": .9 },
  "deciduous-forest": { "fill-color": ["interpolate", ["linear"], ["zoom"], 6, "#d5d9bd", 12, "#e0e3c9", 16, "#e8e8d5"], "fill-opacity": .9 },
  grass: { "fill-color": "#e7ebd3", "fill-opacity": .72 },
  open: { "fill-color": "#ded9c4", "fill-opacity": .75 },
  alvar: { "fill-color": "#ded9c4", "fill-opacity": .75 },
  mountains: { "fill-color": "#ded9c4", "fill-opacity": .75 },
  // Bumped from a near-invisible .55 tan: this is the fallback bucket
  // whenever origoTextureKind()'s Swedish/English keyword matching doesn't
  // recognise a feature's `objekttyp` — if real forest area is silently
  // landing here (classification mismatch) instead of a named forest kind,
  // it needs to actually be visible to notice, not blend into the cream
  // background.
  general: { "fill-color": "#c9cdb0", "fill-opacity": .3 },
}

function origoTextureKind(feature: LandCoverMapFeature): OrigoTextureKind {
  // `kind` is the backend's own authoritative land_cover/wetland split, sent
  // top-level on the feature (not nested in `properties`, where this used to
  // look — meaning it was silently never read and wetland classification
  // relied entirely on `objekttyp`'s free-text Swedish label happening to
  // contain a matching substring). Trust it first when present.
  if (feature.kind === "wetland") return "wetland"
  const properties = feature.properties
  const values = [properties.kind, properties.objekttyp, properties.objekttyp_group]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase()
  if (values.includes("våtmark") || values.includes("sank") || values.includes("myr") || values.includes("wetland")) return "wetland"
  if (values.includes("lövskog") || values.includes("lövträd") || values.includes("deciduous")) return "deciduous-forest"
  if (values.includes("barrskog") || values.includes("barrträd") || values.includes("conifer")) return "coniferous-forest"
  if (values.includes("blandskog") || values.includes("mixed forest")) return "mixed-forest"
  // A bare "skog"/"forest" with no species-specific objekttyp means the
  // backend degraded to its summary/overview tier for a large area, which
  // collapses every forest species (Lövskog, Barr- och blandskog, ...) into
  // just `objekttyp_group: "forest"` with no finer detail (see the marktäcke
  // handoff doc). Guessing "mixed-forest" here used to silently mislabel
  // real Lövskog/Barrskog as blandskog — falling into "general" instead is
  // honest about not knowing the species, and stays visible for the same
  // reason ORIGO_KIND_FILL.general is.
  if (values.includes("skog") || values.includes("forest")) return "general"
  if (values.includes("åker") || values.includes("jordbruk") || values.includes("odlad") || values.includes("agriculture")) return "agriculture"
  if (values.includes("allvar") || values.includes("alvar")) return "alvar"
  if (values.includes("fjäll") || values.includes("berg") || values.includes("mountain")) return "mountains"
  if (values.includes("äng") || values.includes("gräs") || values.includes("grass")) return "grass"
  if (values.includes("öppen mark") || values.includes("hed")) return "open"
  return "general"
}

function rasterTextureKind(feature: LandCoverMapFeature): RasterPolygonFeature["kind"] {
  const kind = origoTextureKind(feature)
  if (kind === "coniferous-forest") return "forest"
  return kind === "alvar" || kind === "mountains" ? "open" : kind
}

function boundsForGeometry(geometry: Geometry) {
  const pairs = geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.type === "MultiPolygon" ? geometry.coordinates.flat(2) : []
  const lngs = pairs.map((point) => point[0])
  const lats = pairs.map((point) => point[1])
  return lngs.length ? [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]] as [[number, number], [number, number]] : null
}

function landLabel(properties: GeoJsonProperties | null) {
  // `objekttyp` is the origo-land-cover feature's own classification (the
  // same data the visible texture is drawn from). OSM's class/subclass/landuse
  // only apply to the ATLAS_INTERACTIVE_LAYERS fallback below.
  const kind = properties?.objekttyp ?? properties?.class ?? properties?.subclass ?? properties?.landuse ?? "markyta"
  return typeof kind === "string" ? kind.replaceAll("_", " ") : "markyta"
}

// Nicer Swedish headings for when Lantmäteriet's own `objekttyp` is just a
// bare, generic term (e.g. plain "Skog") rather than a specific subtype
// (e.g. "Barr- och blandskog") — falls back to our own texture-kind bucket,
// which is at least as specific as the classification already driving the
// visible texture.
const ORIGO_KIND_LABEL: Record<OrigoTextureKind, string> = {
  agriculture: "Åkermark",
  "coniferous-forest": "Barrskog",
  "deciduous-forest": "Lövskog",
  "mixed-forest": "Blandskog",
  grass: "Ängsmark",
  wetland: "Sankmark",
  open: "Öppen mark",
  alvar: "Alvarmark",
  mountains: "Fjällmark",
  general: "Okänd marktyp",
}
const GENERIC_OBJEKTTYP = new Set(["skog", "åker", "åkermark", "mark", "markyta", "mark yta"])

function origoLandLabel(feature: LandCoverMapFeature) {
  const objekttyp = feature.properties.objekttyp
  if (typeof objekttyp === "string" && objekttyp.trim() && !GENERIC_OBJEKTTYP.has(objekttyp.trim().toLowerCase())) {
    return objekttyp.replaceAll("_", " ")
  }
  return ORIGO_KIND_LABEL[origoTextureKind(feature)]
}

const MAX_RATE_LIMIT_RETRIES = 3
const DEFAULT_RATE_LIMIT_RETRY_SECONDS = 5

// Both land-cover fetches (the whole-locale layer and the viewport layer)
// hit the same Lantmäteriet-backed, rate-/size-limited endpoint family (see
// the marktäcke-frontend-handoff doc), so they need identical 413/429
// handling — only the wording and the retry callback differ per caller.
// Centralising it here means the retry policy (attempt cap, default delay)
// has one definition instead of two that could quietly drift apart.
function handleLandCoverFetchError(
  error: unknown,
  attempt: number,
  messages: { tooLarge: string; rateLimitedRetrying: (seconds: number) => string; rateLimitedFinal: string; genericFailure: string },
  setStatus: (message: string) => void,
  retry: (nextAttempt: number, delayMs: number) => void,
  logPrefix: string,
) {
  if (error instanceof LandCoverLookupError && error.status === 413) {
    setStatus(messages.tooLarge)
    return
  }
  if (error instanceof LandCoverLookupError && error.status === 429) {
    if (attempt < MAX_RATE_LIMIT_RETRIES) {
      const delaySeconds = error.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_RETRY_SECONDS
      setStatus(messages.rateLimitedRetrying(delaySeconds))
      retry(attempt + 1, delaySeconds * 1000)
    } else {
      setStatus(messages.rateLimitedFinal)
    }
    return
  }
  // Previously swallowed silently in both callers — a failed/misconfigured
  // land-cover fetch just showed an empty map with no indication why.
  console.error(logPrefix, error)
  setStatus(messages.genericFailure)
}

export function LocaleAtlasMap({ locale, points, selectedPoint, onPointClick }: { locale: TempusLocale; points: readonly AtlasPoint[]; selectedPoint: AtlasPoint | null; onPointClick: (point: AtlasPoint) => void }) {
  const node = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<import("maplibre-gl").Map | null>(null)
  const onPointClickRef = useRef(onPointClick)
  const pointLookup = useRef(new Map<string, AtlasPoint>())
  const bufferedLandCoverRef = useRef<readonly LandCoverMapFeature[]>([])
  const [metersPerPixel, setMetersPerPixel] = useState(1)
  const [layers, setLayers] = useState<AtlasLayers>({ roads: true, buildings: true, wetland: false, landCover: false })
  const [area, setArea] = useState<AreaSelection | null>(null)
  const [mapReady, setMapReady] = useState(0)
  const [mapInstance, setMapInstance] = useState<import("maplibre-gl").Map | null>(null)
  const [origoLandCover, setOrigoLandCover] = useState<readonly LandCoverMapFeature[]>([])
  const [landCoverStatus, setLandCoverStatus] = useState("")
  const [viewportLandCover, setViewportLandCover] = useState<readonly LandCoverMapFeature[]>([])
  const [viewportLandCoverStatus, setViewportLandCoverStatus] = useState("")
  // When "Marktäcke, vyn" is on, its (fresher, viewport-clipped) features are
  // ADDED on top of the whole-locale layer, not swapped in for it — the
  // viewport fetch only ever covers the bbox visible at the moment it ran,
  // so replacing origoLandCover outright left every other part of the
  // locale (anything outside that one bbox, or reached by panning
  // afterwards) with no land-cover data at all. Concatenating means the rest
  // of the locale keeps rendering from origoLandCover as always; only the
  // fetched viewport area gets doubled-up (viewport parcel drawn over the
  // locale one it corresponds to), which is a minor visual overlap rather
  // than a blank map. Still flows through the exact same pipeline below
  // (buffering, the origo-land-cover source, the raster stamps).
  const effectiveLandCover = useMemo<readonly LandCoverMapFeature[]>(
    () => (layers.landCover && viewportLandCover.length ? [...origoLandCover, ...viewportLandCover] : origoLandCover),
    [layers.landCover, origoLandCover, viewportLandCover],
  )
  // Adjacent Lantmäteriet parcels rarely share an exact coincident edge —
  // sub-meter gaps between independently digitized boundaries are normal —
  // which left a thin pale seam wherever two differently classified parcels
  // met. A tiny outward buffer closes that gap (each side overlaps a hair
  // into the other) and its circular joins soften sharp corners as a side
  // effect. Both the map's own solid fill layer and the canvas texture below
  // read this buffered geometry, so their edges always agree with each other.
  const bufferedLandCover = useMemo<readonly LandCoverMapFeature[]>(() => effectiveLandCover.flatMap((feature) => {
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
      // throw outright. One bad feature used to take down this whole
      // useMemo (and with it every layer on the map) — for a locale with
      // many polygons the odds of hitting one go up a lot, which is exactly
      // when this crashed. Fall back to the unbuffered feature instead.
      return [feature]
    }
  }), [effectiveLandCover])
  const rasterPolygons = useMemo<readonly RasterPolygonFeature[]>(() => bufferedLandCover.flatMap((feature, index) => {
    if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") return []
    return [{
      id: String(feature.feature_id ?? index),
      kind: rasterTextureKind(feature),
      geometry: feature.geometry as unknown as RasterPolygonFeature["geometry"],
    }]
  }), [bufferedLandCover])
  // Always the current value for the click handler below (defined once, at
  // map "load" time, so it can't just close over bufferedLandCover directly).
  bufferedLandCoverRef.current = bufferedLandCover

  const localeBoundary = useMemo<RasterPolygonFeature["geometry"] | null>(() => {
    const geometry = locale.geometry as Geometry | null
    if (geometry?.type !== "Polygon" && geometry?.type !== "MultiPolygon") return null
    return geometry as unknown as RasterPolygonFeature["geometry"]
  }, [locale.geometry])

  useEffect(() => { onPointClickRef.current = onPointClick }, [onPointClick])

  useEffect(() => {
    const controller = new AbortController()
    let retryTimer: number | null = null
    const load = (attempt: number) => {
      setLandCoverStatus("")
      void getLocaleLandCoverMap(locale.id, controller.signal).then(
        (response) => {
          if (controller.signal.aborted) return
          setOrigoLandCover(response.features)
          setLandCoverStatus("")
        },
        (error: unknown) => {
          if (controller.signal.aborted) return
          setOrigoLandCover([])
          handleLandCoverFetchError(
            error,
            attempt,
            {
              tooLarge: "Lokalen är för stor för fullständig marktäckning. Använd punktuppslag eller en mindre lokal.",
              rateLimitedRetrying: (seconds) => `Marktäcket är tillfälligt hastighetsbegränsat — försöker igen om ${seconds}s.`,
              rateLimitedFinal: "Marktäcket är tillfälligt hastighetsbegränsat. Försök igen om en stund.",
              genericFailure: "Marktäcket kunde inte hämtas just nu.",
            },
            setLandCoverStatus,
            (nextAttempt, delayMs) => { retryTimer = window.setTimeout(() => { if (!controller.signal.aborted) load(nextAttempt) }, delayMs) },
            `Kunde inte hämta marktäcke för lokal ${locale.id}:`,
          )
        },
      )
    }
    load(0)
    return () => { controller.abort(); if (retryTimer !== null) window.clearTimeout(retryTimer) }
  }, [locale.id])

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
        void registerAtlasPatterns(map).then(() => {
          if (!disposed) map?.triggerRepaint()
        })
        const geometry = locale.geometry as Geometry | null
        const bounds = geometry ? boundsForGeometry(geometry) : null
        if (bounds) map.fitBounds(bounds, { padding: 80, maxZoom: 15, animate: false })
        if (geometry) {
          map.addSource("locale-boundary", { type: "geojson", data: { type: "Feature", properties: {}, geometry } })
          map.addLayer({ id: "locale-boundary", type: "line", source: "locale-boundary", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": JORDEBOK_INK, "line-width": 1.8, "line-dasharray": [1.2, 1.4] } })
        }
        map.addSource("locale-observations", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
        map.addLayer({
          id: "locale-observation-points",
          type: "symbol",
          source: "locale-observations",
          layout: {
            "text-field": ["coalesce", ["get", "label"], ""],
            "text-font": ["Noto Sans Regular"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 10, 14, 16, 24],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          // text-opacity near-zero (not 0 — MapLibre still needs a >0 value
          // to keep hit-testing this layer): the visible text is drawn as
          // plain HTML in Petrona by <ObservationLabels> instead, since
          // MapLibre can only render "Noto Sans Regular" here (no glyphs for
          // any serif font are hosted on OpenFreeMap's glyphs server).
          paint: { "text-color": JORDEBOK_INK, "text-halo-color": "#fbf8f0", "text-halo-width": 1.4, "text-opacity": INVISIBLE_HIT_TESTABLE_OPACITY },
        })
        map.on("click", (event) => {
          if (!map) return
          const pointFeatures = map.queryRenderedFeatures(event.point, { layers: ["locale-observation-points"] })
          const id = pointFeatures[0]?.properties?.id
          if (typeof id === "string") { const point = pointLookup.current.get(id); if (point) onPointClickRef.current(point); return }
          // Test directly against the same bufferedLandCover array the canvas
          // texture is drawn from, instead of querying MapLibre's rendered
          // origo-texture-* layers — those turned out to sometimes disagree
          // with what the canvas actually painted (a field visibly drawn
          // where the rendered layer reported nothing at that pixel). Reading
          // the same data both draw from directly removes any chance of that
          // divergence; OSM (ATLAS_INTERACTIVE_LAYERS) is still the fallback
          // for points outside all origo-land-cover coverage.
          const clickPoint: [number, number] = [event.lngLat.lng, event.lngLat.lat]
          const origoMatches = bufferedLandCoverRef.current.filter((candidate) => {
            if (candidate.geometry.type !== "Polygon" && candidate.geometry.type !== "MultiPolygon") return false
            try {
              return turfBooleanPointInPolygon(clickPoint, candidate.geometry as unknown as Polygon | MultiPolygon)
            } catch {
              return false
            }
          })
          // A point can genuinely carry both a land-cover classification and,
          // independently, a wetland one (e.g. wooded AND wet ground) — the
          // point-lookup endpoint's own land_cover/wetland split reflects
          // that. Surface the wetland match on its own line regardless of
          // which happened to come first in the array, rather than letting
          // it silently lose to whatever else matched at that pixel — the
          // rendered wetland highlight already sits visually on top for the
          // same reason.
          const wetlandMatch = origoMatches.find((candidate) => origoTextureKind(candidate) === "wetland")
          const primaryMatch = origoMatches.find((candidate) => origoTextureKind(candidate) !== "wetland") ?? origoMatches[0]
          const feature = primaryMatch
            ? { type: "Feature" as const, properties: primaryMatch.properties as GeoJsonProperties, geometry: primaryMatch.geometry as unknown as Geometry }
            : (map.queryRenderedFeatures(event.point, { layers: [...ATLAS_INTERACTIVE_LAYERS] })[0] as Feature<Geometry, GeoJsonProperties> | undefined)
          if (!feature?.geometry || (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon")) return
          setArea({
            label: primaryMatch ? origoLandLabel(primaryMatch) : landLabel(feature.properties),
            values: formatHistoricArea(turfArea(feature)),
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
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    pointLookup.current = new Map(points.map((point, index) => [String(point.id ?? index), point]))
    const source = map.getSource("locale-observations") as import("maplibre-gl").GeoJSONSource | undefined
    source?.setData({ type: "FeatureCollection", features: points.map((point, index) => ({ type: "Feature", properties: { id: String(point.id ?? index), label: point.label ?? null }, geometry: { type: "Point", coordinates: [point.coordinates[0], point.coordinates[1]] } })) })
  }, [mapReady, points])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    for (const layer of [...ORIGO_TEXTURE_LAYERS, WETLAND_HIGHLIGHT_LAYER, WETLAND_OUTLINE_LAYER]) if (map.getLayer(layer)) map.removeLayer(layer)
    if (map.getSource("origo-land-cover")) map.removeSource("origo-land-cover")
    map.addSource("origo-land-cover", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: bufferedLandCover.map((feature, index) => ({
          type: "Feature" as const,
          properties: { ...feature.properties, texture_kind: origoTextureKind(feature), id: feature.feature_id ?? index },
          geometry: feature.geometry as unknown as Geometry,
        })),
      },
    })
    for (const kind of ORIGO_TEXTURE_KINDS) {
      // Every kind gets its own real, visible base fill from origo-land-cover
      // (Lantmäteriet) now — it's the map's single source of land-cover
      // colour. Wetland stays an invisible placeholder here: it already has
      // its own dedicated, toggle-only highlight (WETLAND_HIGHLIGHT_LAYER)
      // rather than an always-on base tint.
      const paint = ORIGO_KIND_FILL[kind] ?? { "fill-opacity": INVISIBLE_HIT_TESTABLE_OPACITY }
      // beforeId keeps every dynamically-added fill layer under "water" (a
      // static layer already in the base style, itself under buildings-fill
      // and atlas-places) — without it MapLibre appends new layers at the
      // very top, painting solid land-cover fills over the place-name
      // labels, the building fills (shading houses in whatever beige/green
      // the parcel underneath happened to be), AND the sea: the fetched
      // land-cover polygon's edges don't always hug the real coastline
      // exactly, most visibly at the degraded summary/overview tier used for
      // a large viewport, so a stray sliver of "land" can extend out over
      // open water. Drawing under "water" means MapLibre's own, accurate
      // water polygon always paints back over any such overflow, regardless
      // of how coarse the fetched land-cover geometry is.
      map.addLayer({
        id: `origo-texture-${kind}`,
        type: "fill",
        source: "origo-land-cover",
        filter: ["==", ["get", "texture_kind"], kind],
        paint,
      }, "water")
    }
    // When the viewport land-cover layer is active it's the map's ground
    // truth (see the effect below) and already carries wetland as its own
    // classification — the separate highlight toggle becomes redundant then,
    // so force it visible and let the Sankmark checkbox disable itself.
    map.addLayer({
      id: WETLAND_HIGHLIGHT_LAYER,
      type: "fill",
      source: "origo-land-cover",
      filter: ["==", ["get", "texture_kind"], "wetland"],
      paint: { "fill-color": "#2f6f5e", "fill-opacity": layers.wetland || layers.landCover ? 0.42 : 0 },
    }, "water")
    map.addLayer({
      id: WETLAND_OUTLINE_LAYER,
      type: "line",
      source: "origo-land-cover",
      filter: ["==", ["get", "texture_kind"], "wetland"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#1f4f42", "line-width": 1.2, "line-dasharray": [2, 1.5], "line-opacity": layers.wetland || layers.landCover ? 0.85 : 0 },
    }, "water")
    map.triggerRepaint()
    // layers.wetland deliberately excluded — its own effect below updates the
    // paint on these layers without forcing a full source/layer rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, bufferedLandCover])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const wetlandVisible = layers.wetland || layers.landCover
    if (map.getLayer(WETLAND_HIGHLIGHT_LAYER)) map.setPaintProperty(WETLAND_HIGHLIGHT_LAYER, "fill-opacity", wetlandVisible ? 0.42 : 0)
    if (map.getLayer(WETLAND_OUTLINE_LAYER)) map.setPaintProperty(WETLAND_OUTLINE_LAYER, "line-opacity", wetlandVisible ? 0.85 : 0)
  }, [layers.wetland, layers.landCover, bufferedLandCover])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    for (const layer of ROAD_LAYERS) map.setLayoutProperty(layer, "visibility", layers.roads ? "visible" : "none")
    for (const layer of HOUSE_LAYERS) map.setLayoutProperty(layer, "visibility", layers.buildings ? "visible" : "none")
  }, [layers.buildings, layers.roads])

  // "Marktäcke, vyn" — the current-viewport land-cover layer, per the
  // marktäcke-frontend-handoff. This is origo's own `/api/tempus/land-cover/`
  // endpoint (Lantmäteriet-backed with automatic degradation). Distinct from
  // `origoLandCover` above, which is the whole-locale layer from a different
  // endpoint and always on.
  //
  // Fetches a bbox padded well beyond the visible viewport (see
  // VIEWPORT_LAND_COVER_PADDING_FACTOR below), and only fetches again on
  // navigation once the view has actually moved outside that padded area —
  // not on every moveend. Refetching on every moveend was tried before and
  // made panning with this on unusably slow (re-running the whole
  // buffer/dissolve/raster-stamp pipeline on every pan/zoom tick, sometimes
  // leaving the canvas mid-rebuild with nothing drawn); the padding trades a
  // somewhat larger single request for panning freely inside it at no cost.
  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded() || !layers.landCover) {
      setViewportLandCover([])
      setViewportLandCoverStatus("")
      return
    }
    let controller = new AbortController()
    let retryTimer: number | null = null
    let fetchedBbox: [number, number, number, number] | null = null

    const boundsToBbox = (bounds: ReturnType<typeof map.getBounds>): [number, number, number, number] =>
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]

    const paddedBbox = (bounds: ReturnType<typeof map.getBounds>): [number, number, number, number] => {
      const [west, south, east, north] = boundsToBbox(bounds)
      const padX = (east - west) * VIEWPORT_LAND_COVER_PADDING_FACTOR
      const padY = (north - south) * VIEWPORT_LAND_COVER_PADDING_FACTOR
      return [west - padX, south - padY, east + padX, north + padY]
    }

    const isFullyInside = (inner: readonly number[], outer: readonly number[]) =>
      inner[0]! >= outer[0]! && inner[1]! >= outer[1]! && inner[2]! <= outer[2]! && inner[3]! <= outer[3]!

    // The padded bbox is tried first (see above), but the backend picks its
    // tier by request size — asking for more area than needed can be the
    // difference between getting real per-parcel `objekttyp` (full tier) and
    // getting the degraded summary tier, which collapses every forest
    // species into a bare "forest" with no species left to render (see
    // origoTextureKind). If the padded request comes back degraded, retry
    // once with just the actual visible bounds — small enough that it's the
    // one place worth paying for an extra request, since it's the only way
    // to get real detail back rather than silently keeping a worse result
    // that a smaller request wouldn't have needed to settle for.
    const fetchViewport = (
      attempt: number,
      bbox: [number, number, number, number],
      fallbackBbox: [number, number, number, number] | null,
    ) => {
      void getViewportLandCover(bbox, { signal: controller.signal }).then(
        (response) => {
          if (controller.signal.aborted) return
          const resolved = resolveLandCoverTier(response)
          if (!resolved) { setViewportLandCover([]); setViewportLandCoverStatus(""); return }
          if (resolved.degraded && fallbackBbox) {
            fetchedBbox = fallbackBbox
            fetchViewport(0, fallbackBbox, null)
            return
          }
          setViewportLandCover(resolved.features)
          if (!resolved.degraded) { setViewportLandCoverStatus(""); return }
          const sourceNote = resolved.source === "corine" ? " (CORINE, Europeiska miljöbyrån)" : ""
          setViewportLandCoverStatus(
            resolved.tier === "overview"
              ? `Kraftigt förenklad översikt${sourceNote} — zooma in för fullständigt marktäcke.`
              : `Förenklad kartvy${sourceNote} — zooma in för fullständigt marktäcke.`,
          )
        },
        (error: unknown) => {
          if (controller.signal.aborted) return
          setViewportLandCover([])
          handleLandCoverFetchError(
            error,
            attempt,
            {
              tooLarge: "Vyn är för stor för marktäcke — zooma in eller välj ett mindre område.",
              rateLimitedRetrying: (seconds) => `Marktäcket är tillfälligt hastighetsbegränsat — försöker igen om ${seconds}s.`,
              rateLimitedFinal: "Marktäcket är tillfälligt hastighetsbegränsat. Försök igen om en stund.",
              genericFailure: "Marktäcket för vyn kunde inte hämtas just nu.",
            },
            setViewportLandCoverStatus,
            (nextAttempt, delayMs) => { retryTimer = window.setTimeout(() => { if (!controller.signal.aborted) fetchViewport(nextAttempt, bbox, fallbackBbox) }, delayMs) },
            "Kunde inte hämta marktäcke för vyn:",
          )
        },
      )
    }

    const requestForCurrentView = (attempt: number) => {
      controller.abort()
      controller = new AbortController()
      const bounds = map.getBounds()
      const bbox = paddedBbox(bounds)
      fetchedBbox = bbox
      fetchViewport(attempt, bbox, boundsToBbox(bounds))
    }

    const onMoveEnd = () => {
      if (fetchedBbox && isFullyInside(boundsToBbox(map.getBounds()), fetchedBbox)) return
      requestForCurrentView(0)
    }

    requestForCurrentView(0)
    map.on("moveend", onMoveEnd)
    return () => {
      map.off("moveend", onMoveEnd)
      controller.abort()
      if (retryTimer !== null) window.clearTimeout(retryTimer)
    }
  }, [layers.landCover, mapReady])

  return <div className="relative h-full min-h-0 overflow-hidden bg-[#fbf8f0]">
    <div ref={node} className="h-full w-full" aria-label={`Karta över ${locale.name}`} />
    {mapInstance ? <JordebokRasterTextures map={mapInstance} features={rasterPolygons} localeBoundary={localeBoundary} /> : null}
    {mapInstance ? <PlaceLabels map={mapInstance} /> : null}
    {mapInstance ? <ObservationLabels map={mapInstance} points={points} selectedPoint={selectedPoint} /> : null}
    {mapInstance ? <MapStepNavigation map={mapInstance} /> : null}
    <PlaceSearch onPlace={(place) => mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 14, essential: true })} />
    <LayerPanel layers={layers} onChange={setLayers} />
    <Compass />
    <ScaleBar metersPerPixel={metersPerPixel} />
    {selectedPoint ? <span className="sr-only">Vald observation: {selectedPoint.label}</span> : null}
    {landCoverStatus ? <p className="absolute bottom-16 right-5 z-20 max-w-60 rounded border border-[#4a3526]/50 bg-[#fbf8f0]/90 px-2 py-1 text-xs text-[#4a3526]" role="status">{landCoverStatus}</p> : null}
    {viewportLandCoverStatus ? <p className="absolute bottom-28 right-5 z-20 max-w-60 rounded border border-[#4a3526]/50 bg-[#fbf8f0]/90 px-2 py-1 text-xs text-[#4a3526]" role="status">{viewportLandCoverStatus}</p> : null}
    {area ? <aside className="absolute left-4 top-16 z-20 max-w-72 border border-[#4a3526]/70 bg-[#fbf8f0]/95 p-3 text-xs text-[#4a3526] shadow-sm" aria-live="polite"><p className="font-display text-sm italic capitalize">{area.label}</p>{area.wetland ? <p className="mt-1 capitalize">Sankmark: {area.wetland}</p> : null}<p className="mt-1">{area.values.hectares} · {area.values.tunnland}</p><p className="mt-1 text-[#665744]">{area.values.markland} · {area.values.oresland}<br />{area.values.ortugsland} · {area.values.penningland}</p></aside> : null}
  </div>
}
