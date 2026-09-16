"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { TempusLocale } from "@/app/lib/dal"
import {
  getCountryOverview,
  getLocaleAdministrativeBoundaries,
  getLocaleLandCoverMap,
  getViewportAdministrativeBoundaries,
  getViewportLandCover,
  LandCoverLookupError,
  resolveLandCoverTier,
  type AdministrativeBoundariesResponse,
  type GeoGeometry,
  type LandCoverMapFeature,
  type ViewportLandCoverResponse,
} from "@/app/lib/land-cover"
import { fitGeometryView, geometryBounds, GeoMapCanvas, type GeoMapFeature, type GeoMapInitialView, type GeoMapPoint, type GeoMapTextureLayer } from "@/app/tempus/ui/geo-map-canvas/GeoMapCanvas"
import { PALETTE } from "@/app/tempus/ui/biotope-map/types"

// ---------------------------------------------------------------------------
// Canvas-motsvarigheten till app/tempus/ui/geo-map/SwedenOutlineMap.tsx —
// själva datahämtningen/klassificeringen är identisk (samma API:er, samma
// gruppering av marktyper), bara renderaren under den är utbytt. Se den
// filens motiveringar för varför lagren ser ut som de gör; kommentarer här
// begränsas till det som skiljer sig för canvas-varianten.
// ---------------------------------------------------------------------------

type MapStatus = { message: string; retryable: boolean } | null
// Stable reference for the no-boundaries-yet case — `boundariesData?.features
// ?? []` would otherwise hand out a fresh empty array every render, which
// (as a dependency of the memoized `mapLayers` below) would defeat that
// memoization on every render regardless of whether anything actually changed.
const NO_ADMINISTRATIVE_FEATURES: never[] = []
type LandTextureGroup = "forest" | "dense_forest" | "deciduous_forest" | "agriculture" | "open" | "alvar" | "mountains" | undefined
const MAP_LAYER_DEBOUNCE_MS = 250
const MAP_LAYER_COOLDOWN_MS = 1200

const WATER_FILL = "#C7D1C9"
const WATER_STROKE = "#82918A"
const FOREST_FILL = "#C6C6A6"
const DECIDUOUS_FOREST_FILL = "#D1CEAA"
const FOREST_STROKE = "#74745C"
const AGRICULTURE_FILL = "#DDD2A5"
const AGRICULTURE_STROKE = "#AA9766"
const OPEN_FILL = "#DED7C5"
const OPEN_STROKE = "#A79D84"
const MOUNTAIN_FILL = "#D3CCC0"
const MOUNTAIN_STROKE = "#938A7C"
const WETLAND_FILL = "#BEC7B5"
const WETLAND_STROKE = "#7D8976"
const OTHER_LAND_COVER_FILL = OPEN_FILL
const OTHER_LAND_COVER_STROKE = OPEN_STROKE

function classifyObjekttyp(objekttyp: string | undefined): LandTextureGroup {
  if (!objekttyp) return undefined
  const value = objekttyp.toLowerCase()
  if (value.includes("allvar") || value.includes("alvar")) return "alvar"
  if (value.includes("lövskog") || value.includes("lövträd")) return "deciduous_forest"
  if (value.includes("skog")) return "forest"
  if (value.includes("åker") || value.includes("jordbruk") || value.includes("odlad")) return "agriculture"
  if (value.includes("öppen mark") || value.includes("öppen") || value.includes("hed") || value.includes("gräsmark")) return "open"
  return undefined
}

function swedishGroupLabel(group: LandTextureGroup): string {
  if (group === "forest") return "Skog (översikt)"
  if (group === "dense_forest") return "Tät skog (översikt)"
  if (group === "deciduous_forest") return "Lövskog (översikt)"
  if (group === "agriculture") return "Jordbruksmark (översikt)"
  if (group === "mountains") return "Fjällmark (översikt)"
  if (group === "open") return "Öppen mark (översikt)"
  if (group === "alvar") return "Allvar (översikt)"
  return "Okänd marktyp (översikt)"
}

function normalizeLandTextureGroup(value: unknown, objectType: string | undefined): LandTextureGroup {
  if (value === "dense_forest" || value === "forest") return value
  if (value === "deciduous_forest" || value === "agriculture" || value === "open" || value === "alvar" || value === "mountains") return value
  return classifyObjekttyp(objectType)
}

function landCoverColors(group: LandTextureGroup): { fill: string; stroke: string } {
  if (group === "forest" || group === "dense_forest") return { fill: FOREST_FILL, stroke: FOREST_STROKE }
  if (group === "deciduous_forest") return { fill: DECIDUOUS_FOREST_FILL, stroke: FOREST_STROKE }
  if (group === "agriculture") return { fill: AGRICULTURE_FILL, stroke: AGRICULTURE_STROKE }
  if (group === "mountains") return { fill: MOUNTAIN_FILL, stroke: MOUNTAIN_STROKE }
  if (group === "alvar") return { fill: OPEN_FILL, stroke: OPEN_STROKE }
  if (group === "open") return { fill: OPEN_FILL, stroke: OPEN_STROKE }
  return { fill: OTHER_LAND_COVER_FILL, stroke: OTHER_LAND_COVER_STROKE }
}

type LandCoverClassification = { key: string; group: LandTextureGroup; label: string; fill: string; stroke: string }

function featureField(feature: LandCoverMapFeature, key: string): unknown {
  return feature.properties[key] ?? (feature as unknown as Record<string, unknown>)[key]
}

function classifyLandCoverFeature(feature: LandCoverMapFeature): LandCoverClassification {
  const rawObjekttyp = featureField(feature, "objekttyp")
  const objekttyp = typeof rawObjekttyp === "string" ? rawObjekttyp : undefined
  const objekttypGroup = featureField(feature, "objekttyp_group")
  const group = normalizeLandTextureGroup(objekttypGroup, objekttyp)
  const key = typeof objekttypGroup === "string" ? objekttypGroup : objekttyp ?? "okänd"
  const label = objekttyp ?? swedishGroupLabel(group)
  return { key, group, label, ...landCoverColors(group) }
}

function isDryWetland(feature: LandCoverMapFeature): boolean {
  const rawObjekttyp = featureField(feature, "objekttyp")
  const objectType = typeof rawObjekttyp === "string" ? rawObjekttyp.toLowerCase() : ""
  return objectType.includes("torr") || objectType.includes("fuktäng") || objectType.includes("säsong")
}

function isLake(feature: LandCoverMapFeature): boolean {
  const rawObjekttyp = featureField(feature, "objekttyp")
  const objectType = typeof rawObjekttyp === "string" ? rawObjekttyp.toLowerCase() : ""
  return featureField(feature, "kind") === "lake" || objectType.includes("sjö")
}

type OutlineState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready"
      geometry: GeoGeometry
      initialView: GeoMapInitialView
      lakes: { id: string; geometry: GeoGeometry }[]
      cities: GeoMapPoint[]
      overviewLandCover: LandCoverMapFeature[]
    }

// Delad med SVG-kartan vore trevligare, men den håller sin egen modulvariabel
// (`countryOverviewPromise`) privat — så länge båda kartorna aldrig är
// monterade samtidigt på samma sida kostar den separata cachen här inget
// extra (ett hämtningsanrop per sida oavsett), och det håller de två
// renderarna fria från att behöva dela intern state.
let countryOverviewPromise: ReturnType<typeof getCountryOverview> | null = null

function fetchCountryOverview() {
  countryOverviewPromise ??= getCountryOverview().catch((error: unknown) => {
    countryOverviewPromise = null
    throw error
  })
  return countryOverviewPromise
}

function useCountryOverview(): OutlineState {
  const [state, setState] = useState<OutlineState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    fetchCountryOverview().then(
      (response) => {
        if (cancelled) return
        const lakes = response.waterways.features
          .filter((feature) => feature.properties.kind === "lake")
          .map((feature, index) => ({ id: `lake-${index}`, geometry: feature.geometry }))
        const cities = response.cities.map((city) => ({ id: city.name, coordinates: city.coordinates, label: city.name }))
        setState({ status: "ready", geometry: response.outline.geometry, initialView: response.basemap.initial_view, lakes, cities, overviewLandCover: response.land_cover?.tiers.overview.features ?? [] })
      },
      (error: unknown) => {
        if (cancelled) return
        console.error("Kunde inte hämta Sveriges kontur", error)
        setState({ status: "error", message: error instanceof LandCoverLookupError ? `HTTP ${error.status}` : "Nätverksfel" })
      },
    )
    return () => { cancelled = true }
  }, [])

  return state
}

function geoFeatures(features: readonly LandCoverMapFeature[]): GeoMapFeature[] {
  return features.map((feature, index) => ({
    id: feature.feature_id ?? `${feature.collection}-${index}`,
    geometry: feature.geometry,
  }))
}

function stableSeed(value: string): number {
  let seed = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index)
    seed = Math.imul(seed, 16777619)
  }
  return seed >>> 0
}

function errorMessage(error: unknown, scope: "viewport" | "locale" = "viewport"): MapStatus {
  if (!(error instanceof LandCoverLookupError)) return { message: "Kartdata kunde inte nås. Försök igen.", retryable: true }
  if (error.status === 413) {
    return scope === "locale"
      ? { message: "Platsen är för stor för att visa hela marktäcket. Använd punktuppslag för enskilda punkter istället.", retryable: false }
      : { message: "Vyn är för stor för att visa marktäcke. Zooma in och försök igen.", retryable: false }
  }
  if (error.status === 401 || error.status === 403) return { message: "Du saknar behörighet att visa kartdata.", retryable: false }
  if (error.status === 429) return { message: "För många förfrågningar. Försök igen om en stund.", retryable: true }
  if (error.status === 502 || error.status === 503) return { message: "Kartdata är tillfälligt otillgänglig.", retryable: true }
  return { message: "Kartdata kunde inte hämtas.", retryable: true }
}

export function SwedenOutlineMapCanvas({ locale, points, selectedPoint, onMapClick, onPointClick }: {
  locale: TempusLocale
  points: readonly GeoMapPoint[]
  selectedPoint: GeoMapPoint | null
  onMapClick: (coordinates: readonly [number, number]) => void
  onPointClick: (point: GeoMapPoint) => void
}) {
  const outline = useCountryOverview()
  const localeGeometry = locale.geometry as GeoGeometry | null
  const [viewport, setViewport] = useState<readonly [number, number, number, number] | null>(null)
  const [mapZoom, setMapZoom] = useState<number | null>(null)
  const [baseLandCoverData, setBaseLandCoverData] = useState<ViewportLandCoverResponse | null>(null)
  const [localeLandCoverData, setLocaleLandCoverData] = useState<{ type: "FeatureCollection"; features: LandCoverMapFeature[] } | null>(null)
  const [boundariesData, setBoundariesData] = useState<AdministrativeBoundariesResponse | null>(null)
  const [status, setStatus] = useState<MapStatus>(null)
  const [retry, setRetry] = useState(0)
  // Latch, not a live check: once real land-cover data has been shown, the
  // coarse country-wide fallback (see overviewGroups below) must never come
  // BACK just because a re-render briefly sees empty data (e.g. mid-zoom,
  // before the current fetch resolves) — that produced a visible flicker of
  // layers popping in and out.
  const hasShownRealLandCover = useRef(false)
  const lastLayerFetchAt = useRef(0)
  const COUNTRY_SCALE_VISIBLE_KM = 100
  const viewportWidthKm = viewport
    ? (viewport[2] - viewport[0]) * 111.32 * Math.cos(((viewport[1] + viewport[3]) / 2) * (Math.PI / 180))
    : null
  const isCountryScale = viewportWidthKm === null || viewportWidthKm >= COUNTRY_SCALE_VISIBLE_KM
  const showAdministrativeBoundaries = mapZoom !== null && mapZoom >= 6

  useEffect(() => {
    if (!localeGeometry || isCountryScale) return
    const controller = new AbortController()
    void getLocaleLandCoverMap(locale.id, controller.signal).then(
      (response) => { if (!controller.signal.aborted) { setLocaleLandCoverData({ type: "FeatureCollection", features: response.features }); setStatus(null) } },
      (error: unknown) => { if (!controller.signal.aborted) setStatus(errorMessage(error, "locale")) },
    )
    if (showAdministrativeBoundaries) {
      void getLocaleAdministrativeBoundaries(locale.id, controller.signal).then(
        (response) => { if (!controller.signal.aborted) { setBoundariesData({ type: "FeatureCollection", features: response.features }); setStatus(null) } },
        (error: unknown) => { if (!controller.signal.aborted) setStatus(errorMessage(error, "locale")) },
      )
    } else {
      setBoundariesData(null)
    }
    return () => controller.abort()
  }, [isCountryScale, localeGeometry, locale.id, showAdministrativeBoundaries, retry])

  const localeBounds = useMemo(() => localeGeometry ? geometryBounds(localeGeometry) : null, [localeGeometry])
  const viewportExtendsBeyondLocale = !localeBounds || !viewport
    ? !localeBounds
    : viewport[2] - viewport[0] > (localeBounds[2] - localeBounds[0]) * 1.3 || viewport[3] - viewport[1] > (localeBounds[3] - localeBounds[1]) * 1.3
  const overviewLandCover = outline.status === "ready" ? outline.overviewLandCover : []

  useEffect(() => {
    if (!viewport) return
    const controller = new AbortController()
    const wait = Math.max(MAP_LAYER_DEBOUNCE_MS, MAP_LAYER_COOLDOWN_MS - (Date.now() - lastLayerFetchAt.current))
    const timer = window.setTimeout(() => {
      lastLayerFetchAt.current = Date.now()
      if (isCountryScale) {
        setBaseLandCoverData(null)
        if (overviewLandCover.length) setStatus(null)
      } else if (viewportExtendsBeyondLocale) {
        void getViewportLandCover(viewport, { signal: controller.signal }).then(
          (response) => { if (!controller.signal.aborted) { setBaseLandCoverData(response); setStatus(null) } },
          (error: unknown) => { if (!controller.signal.aborted) setStatus(errorMessage(error)) },
        )
      } else if (localeGeometry) {
        setBaseLandCoverData(null)
      }
      if (showAdministrativeBoundaries && !localeGeometry) {
        void getViewportAdministrativeBoundaries(viewport, { signal: controller.signal }).then(
          (response) => { if (!controller.signal.aborted) { setBoundariesData(response); setStatus(null) } },
          (error: unknown) => { if (!controller.signal.aborted) setStatus(errorMessage(error)) },
        )
      } else if (!showAdministrativeBoundaries) {
        setBoundariesData(null)
      }
    }, wait)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [isCountryScale, overviewLandCover.length, viewport, showAdministrativeBoundaries, localeGeometry, viewportExtendsBeyondLocale, retry])

  const onViewportChange = useCallback((bbox: readonly [number, number, number, number]) => {
    setViewport((current) => current && current.every((value, index) => Math.abs(value - bbox[index]!) < 0.00001) ? current : bbox)
  }, [])

  const baseLandCoverTier = useMemo(() => resolveLandCoverTier(baseLandCoverData), [baseLandCoverData])
  const landCoverFeatures = useMemo(
    () => isCountryScale
      ? overviewLandCover
      : [...(baseLandCoverTier?.features ?? []), ...(localeLandCoverData?.features ?? [])],
    [baseLandCoverTier, isCountryScale, localeLandCoverData, overviewLandCover],
  )
  const wetlandFeatures = useMemo(() => landCoverFeatures.filter((feature) => featureField(feature, "kind") === "wetland"), [landCoverFeatures])
  const lakeFeatures = useMemo(() => landCoverFeatures.filter(isLake), [landCoverFeatures])
  const wetlandGroups = useMemo(() => ({
    wet: wetlandFeatures.filter((feature) => !isDryWetland(feature)),
    dry: wetlandFeatures.filter(isDryWetland),
  }), [wetlandFeatures])
  const landCoverGroups = useMemo(() => {
    const groups = new Map<string, LandCoverClassification & { features: LandCoverMapFeature[] }>()
    for (const feature of landCoverFeatures.filter((feature) => featureField(feature, "kind") === "land_cover")) {
      const classification = classifyLandCoverFeature(feature)
      const entry = groups.get(classification.key) ?? { ...classification, features: [] }
      entry.features.push(feature)
      groups.set(classification.key, entry)
    }
    return [...groups.values()]
  }, [landCoverFeatures])
  if (landCoverGroups.length > 0) hasShownRealLandCover.current = true
  const overviewGroups = useMemo(() => {
    const groups = new Map<string, LandCoverClassification & { features: LandCoverMapFeature[] }>()
    for (const feature of overviewLandCover.filter((feature) => featureField(feature, "kind") === "land_cover")) {
      const classification = classifyLandCoverFeature(feature)
      const entry = groups.get(classification.key) ?? { ...classification, features: [] }
      entry.features.push(feature)
      groups.set(classification.key, entry)
    }
    return [...groups.values()]
  }, [overviewLandCover])
  const textureLayers = useMemo(() => {
    const lakeGeometries = [
      ...(outline.status === "ready" ? outline.lakes.map((lake) => lake.geometry) : []),
      ...lakeFeatures.map((feature) => feature.geometry),
    ]
    const layers: GeoMapTextureLayer[] = []
    for (const { key, group, features, stroke } of landCoverGroups) {
      const kind = group === "forest" || group === "dense_forest" ? "forest" as const
        : group === "deciduous_forest" ? "deciduous-forest" as const
        : group === "agriculture" ? "agriculture" as const
        : group === "open" || group === "alvar" || group === "mountains" ? "open" as const
        : null
      if (!kind) continue
      features.forEach((feature, index) => {
        const featureId = String(feature.feature_id ?? `${key}-${index}`)
        layers.push({
          id: `texture-${featureId}`,
          kind,
          geometries: [feature.geometry],
          excludeGeometries: lakeGeometries,
          color: stroke,
          seed: stableSeed(featureId),
        })
      })
    }
    wetlandGroups.wet.forEach((feature, index) => {
      const featureId = String(feature.feature_id ?? `wetland-${index}`)
      layers.push({
        id: `texture-${featureId}`,
        kind: "wetland",
        geometries: [feature.geometry],
        excludeGeometries: lakeGeometries,
        color: WETLAND_STROKE,
        seed: stableSeed(featureId),
      })
    })
    return layers
  }, [landCoverGroups, lakeFeatures, outline, wetlandGroups.wet])
  const administrativeFeatures = boundariesData?.features ?? NO_ADMINISTRATIVE_FEATURES

  const effectiveInitialView = localeGeometry ? fitGeometryView(localeGeometry) : outline.status === "ready" ? outline.initialView : null

  // Must be memoized: this was previously a plain array literal built inline
  // in the JSX below, so it got a NEW reference on every render — including
  // the render `onZoomChange` itself triggers (it calls `setMapZoom`, a
  // state update in THIS component). GeoMapCanvas's world-bitmap rebuild
  // keys off this array's reference, so every zoom step was rebuilding the
  // entire map TWICE: once for the actual zoom, once more immediately after
  // for a `layers` array that looked different but held identical content.
  // That doubling is why zoom stayed slow even after cutting per-rebuild
  // cost elsewhere.
  const mapLayers = useMemo(() => [
    ...(outline.status !== "ready" || !isCountryScale ? [] : [{ id: "sweden-outline", features: [{ id: "sweden", geometry: outline.geometry }], fill: PALETTE.paperWarm, fillOpacity: 1, stroke: PALETTE.ink, strokeWidth: 1 }]),
    ...(outline.status !== "ready" || !isCountryScale ? [] : [{ id: "sweden-lakes", features: outline.lakes, fill: WATER_FILL, fillOpacity: 0.85, stroke: WATER_STROKE, strokeWidth: 0.75 }]),
    { id: "land-cover-lakes", features: geoFeatures(lakeFeatures), fill: WATER_FILL, fillOpacity: 0.85, stroke: WATER_STROKE, strokeWidth: 0.75 },
    ...(isCountryScale || hasShownRealLandCover.current ? [] : overviewGroups.map(({ key, fill, features }) => {
      return { id: `overview-fallback-${key}`, features: geoFeatures(features), fill, fillOpacity: 0.62, stroke: "none", strokeWidth: 0 }
    })),
    ...landCoverGroups.map(({ key, fill, stroke, features }) => {
      return { id: `land-cover-${key}`, features: geoFeatures(features), fill, fillOpacity: isCountryScale ? 0.72 : 0.76, stroke: isCountryScale ? "none" : stroke, strokeWidth: isCountryScale ? 0 : 0.4 }
    }),
    { id: "wetland", features: geoFeatures(wetlandGroups.wet), fill: WETLAND_FILL, fillOpacity: isCountryScale ? 0.72 : 0.8, stroke: isCountryScale ? "none" : WETLAND_STROKE, strokeWidth: isCountryScale ? 0 : 0.75 },
    { id: "dry-wetland", features: geoFeatures(wetlandGroups.dry), fill: WETLAND_FILL, fillOpacity: isCountryScale ? 0.5 : 0.6, stroke: isCountryScale ? "none" : WETLAND_STROKE, strokeWidth: isCountryScale ? 0 : 0.75 },
    ...(showAdministrativeBoundaries ? [
      { id: "municipality", features: geoFeatures(administrativeFeatures.filter((feature) => featureField(feature, "kind") === "municipality")), stroke: "var(--border)", strokeWidth: 1, strokeDasharray: [4, 3] },
      { id: "county-casing", features: geoFeatures(administrativeFeatures.filter((feature) => featureField(feature, "kind") === "county")), stroke: "var(--surface)", strokeWidth: 3 },
      { id: "county", features: geoFeatures(administrativeFeatures.filter((feature) => featureField(feature, "kind") === "county")), stroke: "var(--accent)", strokeOpacity: 0.8, strokeWidth: 1.1 },
      { id: "administrative-other", features: geoFeatures(administrativeFeatures.filter((feature) => featureField(feature, "kind") !== "municipality" && featureField(feature, "kind") !== "county")), stroke: "var(--text-muted)", strokeWidth: 1 },
    ] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [outline, isCountryScale, lakeFeatures, overviewGroups, landCoverGroups, wetlandGroups, showAdministrativeBoundaries, administrativeFeatures])

  return <div className="flex h-full min-h-0 flex-col">
    {effectiveInitialView ? <GeoMapCanvas
      key={`${effectiveInitialView.center.join(",")}-${effectiveInitialView.zoom}`}
      initialView={effectiveInitialView}
      focusGeometry={isCountryScale ? null : localeGeometry}
      backgroundFill={PALETTE.paperWarm}
      layers={mapLayers}
      textureLayers={textureLayers}
      points={points}
      markers={outline.status === "ready" ? outline.cities : []}
      selectedPoint={selectedPoint}
      onMapClick={onMapClick}
      onPointClick={onPointClick}
      onViewportChange={onViewportChange}
      onZoomChange={setMapZoom}
      title={`Karta över ${locale.name}`}
    /> : <div className="m-auto px-4 text-sm text-text-muted"><p>{outline.status === "error" ? outline.message : "Hämtar kartan…"}</p></div>}
    {effectiveInitialView && status ? <div className="border-t border-border px-4 py-2 text-sm text-text-muted"><p>{status.message}</p>{status.retryable ? <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-1 font-display italic text-accent underline underline-offset-4 hover:text-accent-hover">Försök igen</button> : null}</div> : null}
    {baseLandCoverTier?.degraded && !localeLandCoverData ? <p className="border-t border-border px-4 py-2 text-sm text-text-muted">{baseLandCoverTier.tier === "summary" ? "Förenklad kartvy — zooma in för fullständig marktäckning." : "Kraftigt förenklad översikt" + (baseLandCoverTier.source === "corine" ? " (CORINE Land Cover, © European Environment Agency)." : ".")}</p> : null}
    {outline.status === "error" ? <p className="border-t border-border px-4 py-2 text-sm text-text-muted">Sverigekontur kunde inte hämtas: {outline.message}</p> : null}
  </div>
}
