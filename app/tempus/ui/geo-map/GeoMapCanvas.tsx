"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react"
import type { GeoGeometry, GeoPosition } from "@/app/lib/land-cover"
import { buildBiotopeTexture, type BiotopeTextureKind, type ScreenRing } from "@/app/tempus/ui/geo-map/biotope-texture"
import { CompassRose } from "@/app/tempus/ui/geo-map/CompassRose"
import { ScaleBar } from "@/app/tempus/ui/geo-map/ScaleBar"

export type { GeoGeometry, GeoPosition }

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type GeoMapFeature = { id: string | number; geometry: GeoGeometry; fill?: string }
export type GeoMapIllustration = { id: string | number; coordinates: GeoPosition; href: string; width: number; height: number; opacity?: number; rotation?: number }
// Handritad marktäckestextur (skog/äng-åker/sankmark) — de faktiska symbolerna
// från biotopkarte-generatorn (app/tempus/ui/biotope-map) strödda ut över de
// givna geometrierna. Projiceras och strös i skärmpixlar (inte grader), så
// tätheten blir korrekt oavsett breddgrad eller zoomnivå — se biotope-texture.ts.
export type GeoMapTextureLayer = {
  id: string
  kind: BiotopeTextureKind
  geometries: readonly GeoGeometry[]
  excludeGeometries?: readonly GeoGeometry[]
  color: string
  seed?: number
}
export type GeoMapLayer = { id: string; features: readonly GeoMapFeature[]; illustrations?: readonly GeoMapIllustration[]; fill?: string; fillOpacity?: number; stroke?: string; strokeOpacity?: number; strokeWidth?: number; strokeDasharray?: string; filter?: string }
export type GeoMapPoint = { id?: string | number; coordinates: GeoPosition; label?: string }
export type GeoMapInitialView = { center: readonly [number, number]; zoom: number }

export const GEO_MAP_WIDTH = 1000
export const GEO_MAP_HEIGHT = 700
const WIDTH = GEO_MAP_WIDTH
const HEIGHT = GEO_MAP_HEIGHT
const TILE_SIZE = 256
const MIN_ZOOM = 1
const MAX_ZOOM = 18

type View = { lng: number; lat: number; zoom: number }

// ---------------------------------------------------------------------------
// Web Mercator projection helpers
//
// These are plain, stateless coordinate-space conversions — the same math a
// slippy-map library uses internally. `worldPoint`/`positionFromWorld` map
// between geographic (lng/lat) and "world pixel" space at a given zoom;
// `project`/`unproject` (defined inside the component, since they also need
// the current pan offset) go from world space to the SVG's own 1000×700
// viewBox space and back.
// ---------------------------------------------------------------------------

function worldPoint([lng, lat]: GeoPosition, zoom: number): readonly [number, number] {
  const scale = TILE_SIZE * 2 ** zoom
  const limitedLatitude = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const sinLatitude = Math.sin((limitedLatitude * Math.PI) / 180)
  return [((lng + 180) / 360) * scale, (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale]
}

function positionFromWorld(x: number, y: number, zoom: number): GeoPosition {
  const scale = TILE_SIZE * 2 ** zoom
  return [(x / scale) * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI]
}

function rings(geometry: GeoGeometry): readonly (readonly GeoPosition[])[] {
  return geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat()
}

// ---------------------------------------------------------------------------
// Geometry utilities (exported for callers that need bounds/fit without
// rendering — e.g. SwedenOutlineMap compares a Locale's bounds against the
// current viewport to decide when the wide base layer is needed).
// ---------------------------------------------------------------------------

export function geometryBounds(geometry: GeoGeometry): readonly [number, number, number, number] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  for (const ring of rings(geometry)) {
    for (const [lng, lat] of ring) {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    }
  }
  return [minLng, minLat, maxLng, maxLat]
}

export function fitGeometryView(geometry: GeoGeometry, width = WIDTH, height = HEIGHT): GeoMapInitialView {
  const [minLng, minLat, maxLng, maxLat] = geometryBounds(geometry)
  const center: readonly [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
  let zoom = MAX_ZOOM
  for (; zoom > MIN_ZOOM; zoom--) {
    const [x0, y0] = worldPoint([minLng, maxLat], zoom)
    const [x1, y1] = worldPoint([maxLng, minLat], zoom)
    if (x1 - x0 <= width && y1 - y0 <= height) break
  }
  return { center, zoom }
}

function geometryPath(geometry: GeoGeometry, project: (point: GeoPosition) => readonly [number, number]) {
  return rings(geometry).map((ring) => ring.map((point, index) => {
    const [x, y] = project(point)
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`
  }).join("") + "Z").join("")
}

// ---------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------

export function GeoMapCanvas({ initialView, focusGeometry, layers, textureLayers = [], points = [], markers = [], selectedPoint, onMapClick, onPointClick, onViewportChange, onZoomChange, title, defs }: {
  initialView: GeoMapInitialView
  focusGeometry?: GeoGeometry | null
  layers: readonly GeoMapLayer[]
  textureLayers?: readonly GeoMapTextureLayer[]
  points?: readonly GeoMapPoint[]
  markers?: readonly GeoMapPoint[]
  selectedPoint?: GeoMapPoint | null
  onMapClick?: (coordinates: GeoPosition) => void
  onPointClick?: (point: GeoMapPoint) => void
  onViewportChange?: (bbox: readonly [number, number, number, number]) => void
  onZoomChange?: (zoom: number) => void
  title: string
  /**
   * SVG <pattern>/<linearGradient> etc. referenced by layers via fill="url(#…)".
   * Pass a function to receive the map's current pan offset (in SVG units) so
   * a pattern can be geo-anchored via `patternTransform` — otherwise its grid
   * stays fixed to the canvas while the polygon underneath it moves.
   */
  defs?: ReactNode | ((offset: { x: number; y: number }) => ReactNode)
}) {
  // --- View state & projection --------------------------------------------
  // `view` is the only source of truth for where the map is looking; every
  // pixel/geo conversion below is derived from it each render.
  const [view, setView] = useState<View>({ lng: initialView.center[0], lat: initialView.center[1], zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialView.zoom)) })
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const pendingPan = useRef({ x: 0, y: 0 })
  const panFrame = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: WIDTH, height: HEIGHT })
  const tileZoom = Math.round(view.zoom)
  // Skalstocken avser kartans referenslatitud. Web Mercator ändrar sin
  // markskala med latitud, men att låta skalan följa varje pan gör att både
  // längd och etikett hoppar trots oförändrad zoom. Referensen är därför
  // låst till kartans startvy; skalstocken ändras endast när användaren zoomar.
  const scaleLatitude = useRef(initialView.center[1]).current
  // `center` is memoized (not just recomputed inline) because the viewport-
  // change effect below depends on it by reference — without memoizing, a
  // fresh array every render would re-fire that effect on every render, not
  // just on actual view changes.
  const center = useMemo(() => worldPoint([view.lng, view.lat], tileZoom), [view.lng, view.lat, tileZoom])
  const project = (point: GeoPosition): readonly [number, number] => {
    const [x, y] = worldPoint(point, tileZoom)
    return [WIDTH / 2 + x - center[0], HEIGHT / 2 + y - center[1]]
  }
  const unproject = (x: number, y: number): GeoPosition => positionFromWorld(center[0] + x - WIDTH / 2, center[1] + y - HEIGHT / 2, tileZoom)
  // Marktäckestexturen (brusfält, marching squares, symbolströning) är för
  // dyr att bygga om varje bildruta under en drag/pan — den behöver bara
  // räknas om när själva zoomnivån eller lagren ändras. Bygg den därför i ett
  // stabilt "världsrum" (bara beroende av `tileZoom`, inte panorering) och
  // panorera hela gruppen billigt via en transform istället för att räkna om
  // geometrin varje musrörelse.
  const textureGroups = useMemo(() => textureLayers.map((layer) => {
    const toWorldRings = (geometry: GeoGeometry): ScreenRing[] => rings(geometry).map((ring) => ring.map((point) => worldPoint(point, tileZoom)))
    const screenRings = layer.geometries.flatMap(toWorldRings)
    const excludeScreenRings = (layer.excludeGeometries ?? []).flatMap(toWorldRings)
    return { id: layer.id, screenRings, excludeScreenRings, elements: buildBiotopeTexture(layer.kind, screenRings, layer.seed ?? 1, layer.color) }
  }), [textureLayers, tileZoom])
  // Samma bailout-knep som layerGroups ovan, men här är det extra viktigt —
  // symbolströningen kan lägga tusentals <path>-element per lager, och det är
  // just den kostnaden (om den återskapades varje pekarrörelse) som gjorde
  // panorering märkbart hackig.
  const textureGroupElements = useMemo(() => textureGroups.map(({ id, screenRings, excludeScreenRings, elements }) => {
    const clipId = `texture-clip-${id}`
    const ringPath = (ring: ScreenRing) => `M${ring.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`
    return <g key={id} pointerEvents="none">
      <clipPath id={clipId} clipRule="evenodd">
        {[...screenRings, ...excludeScreenRings].map((ring, index) => <path key={index} d={ringPath(ring)} />)}
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {elements.map((element, index) => element.t === "path"
          ? <path key={index} d={element.d} fill={element.f ?? "none"} stroke={element.s} strokeWidth={element.w ?? 1} opacity={element.o ?? 1} strokeDasharray={element.dash} vectorEffect="non-scaling-stroke" />
          : null)}
      </g>
    </g>
  }), [textureGroups])
  // Samma knep för de vanliga polygon-lagren (marktäcke, landsöversiktens
  // bakgrund, administrativa gränser): `geometryPath` med den panorerings-
  // beroende `project()` räknades tidigare om för VARJE feature, VARJE
  // bildruta under drag/zoom — även för landsöversiktens stora, tusentals
  // punkter tunga polygoner. Bygg path-strängarna i stabilt världsrum en gång
  // per lager/zoomnivå istället, och panorera dem billigt via samma transform
  // som texturlagret ovan.
  const layerWorldPaths = useMemo(() => {
    const project = (point: GeoPosition) => worldPoint(point, tileZoom)
    return layers.map((layer) => ({
      ...layer,
      worldFeatures: layer.features.map((feature) => ({ id: feature.id, fill: feature.fill, d: geometryPath(feature.geometry, project) })),
      worldIllustrations: layer.illustrations?.map((illustration) => ({ ...illustration, world: worldPoint(illustration.coordinates, tileZoom) })),
    }))
  }, [layers, tileZoom])
  // Panorering ändrar bara `center` (view.lng/lat), inte `layerWorldPaths`
  // eller `textureGroups` (de beror bara på tileZoom/lager, se ovan). Men utan
  // denna memo byggs ändå tusentals <path>-element (särskilt symbolströningen
  // i texturlagren) om som NYA React-element varje bildruta under drag, och
  // reconcilern måste diffa alla — även om inget av dem faktiskt ändras. Genom
  // att memoisera själva JSX-trädet på layerWorldPaths/textureGroups (inte på
  // center) återanvänder React samma elementreferens och hoppar över hela
  // diffen; bara den yttre <g transform=...> nedan behöver uppdateras varje
  // bildruta.
  const layerGroups = useMemo(() => layerWorldPaths.map((layer) => <g key={layer.id} fill={layer.fill ?? "none"} fillOpacity={layer.fillOpacity ?? 1} stroke={layer.stroke ?? "var(--border)"} strokeOpacity={layer.strokeOpacity ?? 1} strokeWidth={layer.strokeWidth ?? 1} strokeDasharray={layer.strokeDasharray} filter={layer.filter} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
    {layer.worldFeatures.map((feature) => <path key={String(feature.id)} d={feature.d} fill={feature.fill} fillRule="evenodd" />)}
    {layer.worldIllustrations?.map((illustration) => {
      const [x, y] = illustration.world
      return <image key={String(illustration.id)} href={illustration.href} x={x - illustration.width / 2} y={y - illustration.height / 2} width={illustration.width} height={illustration.height} opacity={illustration.opacity ?? 1} transform={illustration.rotation ? `rotate(${illustration.rotation} ${x} ${y})` : undefined} preserveAspectRatio="xMidYMid meet" />
    })}
  </g>), [layerWorldPaths])
  const canvasAspectRatio = canvasSize.height > 0 ? canvasSize.width / canvasSize.height : WIDTH / HEIGHT
  const visibleWidth = Math.min(WIDTH, HEIGHT * canvasAspectRatio)
  const visibleHeight = Math.min(HEIGHT, WIDTH / canvasAspectRatio)
  const visibleX = (WIDTH - visibleWidth) / 2
  const visibleY = (HEIGHT - visibleHeight) / 2
  const visibleFrame = useRef({ x: visibleX, y: visibleY, width: visibleWidth, height: visibleHeight })
  visibleFrame.current = { x: visibleX, y: visibleY, width: visibleWidth, height: visibleHeight }

  // --- Viewport reporting ----------------------------------------------------
  useEffect(() => {
    if (!onViewportChange) return
    // Att rapportera varje enskild pekarrörelse får föräldern att bygga om
    // kartans lager samtidigt som SVG:n panoreras. Vänta tills draget släpps;
    // då kan den lokala kartvyn och dess geo-förankrade texturer röra sig mjukt.
    if (drag.current) return
    const [minLng, maxLat] = unproject(0, 0)
    const [maxLng, minLat] = unproject(WIDTH, HEIGHT)
    onViewportChange([minLng, minLat, maxLng, maxLat])
  }, [view, center, onViewportChange, tileZoom])
  useEffect(() => { onZoomChange?.(tileZoom) }, [onZoomChange, tileZoom])

  // --- Zoom & pan ------------------------------------------------------------
  const eventPointFromClient = (clientX: number, clientY: number): readonly [number, number] => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return [WIDTH / 2, HEIGHT / 2]
    const frame = visibleFrame.current
    // `slice` beskär viewBoxen på smala/breda skärmar. Musen måste därför
    // översättas till den faktiskt synliga delen, inte till hela 1000×700.
    return [frame.x + ((clientX - rect.left) / rect.width) * frame.width, frame.y + ((clientY - rect.top) / rect.height) * frame.height]
  }
  const eventPoint = (event: PointerEvent<SVGSVGElement>) => eventPointFromClient(event.clientX, event.clientY)
  const zoom = (increment: number, anchor: readonly [number, number] = [visibleX + visibleWidth / 2, visibleY + visibleHeight / 2]) => setView((current) => {
    const currentZoom = Math.round(current.zoom)
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + increment))
    if (nextZoom === currentZoom) return current
    const [centerX, centerY] = worldPoint([current.lng, current.lat], currentZoom)
    const [anchorLng, anchorLat] = positionFromWorld(centerX + anchor[0] - WIDTH / 2, centerY + anchor[1] - HEIGHT / 2, currentZoom)
    const [anchorX, anchorY] = worldPoint([anchorLng, anchorLat], nextZoom)
    const [lng, lat] = positionFromWorld(anchorX - anchor[0] + WIDTH / 2, anchorY - anchor[1] + HEIGHT / 2, nextZoom)
    return { lng, lat, zoom: nextZoom }
  })
  const applyPan = (dx: number, dy: number) => setView((current) => {
    const [worldX, worldY] = worldPoint([current.lng, current.lat], Math.round(current.zoom))
    const [lng, lat] = positionFromWorld(worldX - dx, worldY - dy, Math.round(current.zoom))
    return { ...current, lng, lat }
  })

  // React's synthetic onWheel is attached passively, so event.preventDefault()
  // there cannot stop the page from scrolling. Attach a native, non-passive
  // listener instead so scrolling over the map only zooms it.
  useEffect(() => {
    const node = svgRef.current
    if (!node) return
    const handleWheel = (event: globalThis.WheelEvent) => { event.preventDefault(); zoom(event.deltaY < 0 ? 1 : -1, eventPointFromClient(event.clientX, event.clientY)) }
    node.addEventListener("wheel", handleWheel, { passive: false })
    return () => node.removeEventListener("wheel", handleWheel)
  }, [])
  useEffect(() => {
    const node = svgRef.current
    if (!node) return
    const updateSize = () => {
      const width = node.clientWidth
      const height = node.clientHeight
      setCanvasSize((current) => current.width === width && current.height === height ? current : { width, height })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => () => { if (panFrame.current !== null) window.cancelAnimationFrame(panFrame.current) }, [])

  // --- Rendering ---------------------------------------------------------
  return <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-surface">
    <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice" className="block h-full w-full min-h-0 flex-1 touch-none select-none" style={{ userSelect: "none", WebkitUserSelect: "none" }} role="img" aria-label={title}
      // Pointer drag is batched to one `requestAnimationFrame` update instead
      // of applying every raw pointermove — panning a texture-heavy SVG on
      // every event was visibly janky; this keeps it smooth.
      onPointerDown={(event) => { const [x, y] = eventPoint(event); drag.current = { x, y, moved: false }; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={(event) => {
        if (!drag.current) return
        const [x, y] = eventPoint(event)
        const dx = x - drag.current.x
        const dy = y - drag.current.y
        if (Math.abs(dx) + Math.abs(dy) > 2) drag.current.moved = true
        drag.current = { ...drag.current, x, y }
        pendingPan.current.x += dx
        pendingPan.current.y += dy
        if (panFrame.current !== null) return
        panFrame.current = window.requestAnimationFrame(() => {
          const pending = pendingPan.current
          pendingPan.current = { x: 0, y: 0 }
          panFrame.current = null
          applyPan(pending.x, pending.y)
        })
      }}
      onPointerUp={(event) => {
        const moved = drag.current?.moved
        drag.current = null
        if (panFrame.current !== null) {
          window.cancelAnimationFrame(panFrame.current)
          panFrame.current = null
          const pending = pendingPan.current
          pendingPan.current = { x: 0, y: 0 }
          applyPan(pending.x, pending.y)
        }
        if (moved) {
          // Utlöser en enda viewport-rapport efter draget, nu när effekten
          // ovan inte längre är spärrad av drag.current.
          setView((current) => ({ ...current }))
        } else if (onMapClick) {
          const [x, y] = eventPoint(event)
          onMapClick(unproject(x, y))
        }
      }}>
      {/* Caller-supplied patterns/gradients, plus the paper-grain filter used below. */}
      <defs>
        {typeof defs === "function" ? defs({
          x: WIDTH / 2 - center[0],
          y: HEIGHT / 2 - center[1],
        }) : defs}
        <filter id="map-paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0" />
        </filter>
      </defs>

      {/* Base + caller-supplied polygon/line layers, back to front in array order.
          Byggda i världsrum (layerWorldPaths, ovan) och bara panorerade här via
          en billig transform — se motiveringen där. */}
      <rect width={WIDTH} height={HEIGHT} fill="var(--surface)" />
      {/* `style.transform` (not the `transform` SVG attribute) so the browser
          compositor can promote this group to its own GPU layer and just
          slide the already-rasterized pixels during a drag, instead of
          repainting every path/glyph underneath on every pointermove frame —
          which is what actually made panning feel slow, even after React
          stopped rebuilding the elements (see layerGroups/textureGroupElements
          above). `willChange` keeps that layer alive across renders rather
          than only during an active CSS transition. */}
      <g style={{ transform: `translate(${WIDTH / 2 - center[0]}px, ${HEIGHT / 2 - center[1]}px)`, willChange: "transform" }}>
        {layerGroups}
      </g>
      {/* Handritad marktäckestextur — se GeoMapTextureLayer/biotope-texture.ts.
          Byggd i världsrum (textureGroups, ovan) och bara panorerad här via en
          billig transform, så drag/pan inte behöver bygga om brusfält och
          marching-squares-konturer varje bildruta. */}
      <g style={{ transform: `translate(${WIDTH / 2 - center[0]}px, ${HEIGHT / 2 - center[1]}px)`, willChange: "transform" }}>
        {textureGroupElements}
      </g>
      {/* A fine sepia boundary keeps the locale legible without the heavy GIS-style casing. */}
      {focusGeometry ? <><path d={geometryPath(focusGeometry, project)} fill="none" stroke="var(--surface)" strokeWidth="2" fillRule="evenodd" pointerEvents="none" /><path d={geometryPath(focusGeometry, project)} fill="none" stroke="#4A3526" strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round" fillRule="evenodd" pointerEvents="none" /></> : null}

      {/* Non-interactive labels (e.g. city names), then clickable/selectable points on top. */}
      {markers.slice(0, tileZoom <= 5 ? 5 : markers.length).map((marker, index) => { const [x, y] = project(marker.coordinates); const fontSize = tileZoom <= 5 ? 10 : 12; return <g key={String(marker.id ?? index)} transform={`translate(${x} ${y})`} pointerEvents="none"><circle r="1.5" fill="#4A3526" /><text x={4} y={3} fontSize={fontSize} fill="#4A3526" fontFamily="var(--font-display)" fontStyle="italic" stroke="var(--surface)" strokeWidth="1" paintOrder="stroke">{marker.label}</text></g> })}
      {tileZoom >= 9 ? (() => { const grouped = new Map<string, typeof points>(); points.forEach(pt => { const key = `${pt.coordinates[0]},${pt.coordinates[1]}`; if (!grouped.has(key)) grouped.set(key, []); grouped.get(key)!.push(pt); }); return Array.from(grouped.entries()).map(([key, pts]) => { const [lng, lat] = pts[0]!.coordinates; const [x, y] = project([lng, lat]); const splitAt = Math.ceil(pts.length / 2); const rows = [pts.slice(0, splitAt), pts.slice(splitAt)]; const pointColor = (point: typeof pts[number]) => selectedPoint && String(point.id) === String(selectedPoint.id) ? "var(--accent)" : "#000"; const selectFirst = () => onPointClick?.(pts[0]!); return <g key={key} transform={`translate(${x} ${y - 8})`} role={onPointClick ? "button" : undefined} tabIndex={onPointClick ? 0 : undefined} className={onPointClick ? "cursor-pointer" : undefined} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); selectFirst(); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectFirst(); } }}><text x={0} y={0} fontSize={16} fontWeight="bold" fontFamily="Georgia, serif" textAnchor="middle" style={{ fontStyle: "italic" }}>{rows[0].map((point, index) => <tspan key={String(point.id)} dx={index > 0 ? 8 : 0} fill={pointColor(point)}>{point.label}</tspan>)}</text>{rows[1].length > 0 ? <text x={0} y={19} fontSize={16} fontWeight="bold" fontFamily="Georgia, serif" textAnchor="middle" style={{ fontStyle: "italic" }}>{rows[1].map((point, index) => <tspan key={String(point.id)} dx={index > 0 ? 8 : 0} fill={pointColor(point)}>{point.label}</tspan>)}</text> : null}<title>{pts.map((point) => point.label ?? "Observation").join(", ")}</title></g>; }); })() : null}

      {/* Chrome: a subtle full-canvas grain overlay for the "old paper" feel, then the fixed-position compass/scale. */}
      <rect width={WIDTH} height={HEIGHT} filter="url(#map-paper-grain)" opacity={0.12} style={{ mixBlendMode: "multiply" }} pointerEvents="none" />
      <CompassRose x={visibleX + 78} y={visibleY + visibleHeight - 100} />
      <ScaleBar lat={scaleLatitude} zoom={tileZoom} x={visibleX + 160} y={visibleY + visibleHeight - 62} />
    </svg>
    <div className="absolute bottom-3 right-3 flex border border-border-strong bg-surface/90 font-display text-lg text-accent"><button type="button" onClick={() => zoom(1)} className="border-r border-border px-2 py-0.5 hover:bg-accent-wash" aria-label="Zooma in">+</button><button type="button" onClick={() => zoom(-1)} className="px-2 py-0.5 hover:bg-accent-wash" aria-label="Zooma ut">−</button></div>
  </div>
}
