"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { buildEdgeFade, EDGE_FADE_DISTANCE_PX, ringsBounds, type ScreenRing } from "@/app/tempus/ui/geo-map/biotope-texture"
import type { GlyphAssetKind } from "@/app/tempus/ui/geo-map-canvas/glyph-assets"
import { getImage, RASTER_ASSETS } from "@/app/tempus/ui/geo-map-canvas/raster-assets"
import { mulberry32 } from "@/app/tempus/ui/biotope-map/noise"
import {
  fitGeometryView,
  geometryBounds,
  geometryPath,
  GEO_MAP_HEIGHT,
  GEO_MAP_WIDTH,
  MAX_ZOOM,
  MIN_ZOOM,
  positionFromWorld,
  rings,
  worldPoint,
  type GeoGeometry,
  type GeoMapInitialView,
  type GeoPosition,
} from "@/app/tempus/ui/geo-map/projection"
import { createColorResolver, resolveFontFamily, type ColorResolver } from "@/app/tempus/ui/geo-map-canvas/resolve-color"
import { CompassRose } from "@/app/tempus/ui/geo-map/CompassRose"
import { ScaleBar } from "@/app/tempus/ui/geo-map/ScaleBar"

export { fitGeometryView, geometryBounds }
export type { GeoGeometry, GeoMapInitialView, GeoPosition }

// ---------------------------------------------------------------------------
// Public types — deliberately identical in shape to the SVG map's
// (GeoMapFeature/GeoMapLayer/GeoMapTextureLayer/GeoMapPoint) so a caller like
// SwedenOutlineMap can build the same `layers`/`textureLayers` data once and
// hand it to either renderer.
// ---------------------------------------------------------------------------

export type GeoMapFeature = { id: string | number; geometry: GeoGeometry; fill?: string }
export type GeoMapTextureLayer = {
  id: string
  kind: GlyphAssetKind
  geometries: readonly GeoGeometry[]
  excludeGeometries?: readonly GeoGeometry[]
  // Andra marktypers ytor som gränsar till denna — tunnar ut symbolströningen
  // nära gränsen mot dem i stället för att klippa den tvärt. Se buildEdgeFade
  // i biotope-texture.ts.
  neighborGeometries?: readonly GeoGeometry[]
  color: string
  seed?: number
}
export type GeoMapLayer = { id: string; features: readonly GeoMapFeature[]; fill?: string; fillOpacity?: number; stroke?: string; strokeOpacity?: number; strokeWidth?: number; strokeDasharray?: readonly number[] }
export type GeoMapPoint = { id?: string | number; coordinates: GeoPosition; label?: string }

const WIDTH = GEO_MAP_WIDTH
const HEIGHT = GEO_MAP_HEIGHT

type View = { lng: number; lat: number; zoom: number }
type WorldBitmap = { canvas: HTMLCanvasElement; originX: number; originY: number }
type HitTarget = { x: number; y: number; radius: number; point: GeoMapPoint }

function setPath2DDash(ctx: CanvasRenderingContext2D, dash: readonly number[] | undefined) {
  ctx.setLineDash(dash ?? [])
}

/**
 * Draws every layer's features into `ctx`, which the caller has already
 * translated so that (0,0) is the world bitmap's own origin — i.e. features
 * are projected with `worldPoint` and then just shifted by `-origin`, no
 * further scaling. This is the canvas analogue of the SVG map's
 * `layerWorldPaths`.
 */
function paintLayers(ctx: CanvasRenderingContext2D, layers: readonly GeoMapLayer[], tileZoom: number, origin: readonly [number, number], resolveColor: ColorResolver) {
  const project = (point: GeoPosition): readonly [number, number] => {
    const [x, y] = worldPoint(point, tileZoom)
    return [x - origin[0], y - origin[1]]
  }
  for (const layer of layers) {
    ctx.fillStyle = resolveColor(layer.fill ?? "transparent")
    ctx.strokeStyle = resolveColor(layer.stroke ?? "transparent")
    ctx.globalAlpha = 1
    ctx.lineWidth = layer.strokeWidth ?? 1
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    setPath2DDash(ctx, layer.strokeDasharray)
    for (const feature of layer.features) {
      const path = new Path2D(geometryPath(feature.geometry, project))
      if (layer.fill) {
        ctx.globalAlpha = layer.fillOpacity ?? 1
        ctx.fillStyle = resolveColor(feature.fill ?? layer.fill)
        ctx.fill(path, "evenodd")
      }
      if (layer.stroke) {
        ctx.globalAlpha = layer.strokeOpacity ?? 1
        ctx.stroke(path)
      }
    }
  }
  ctx.globalAlpha = 1
  ctx.setLineDash([])
}

/**
 * Draws transparent raster ink crops from the supplied reference, clipped to
 * the layer's own geometry MINUS excluded geometry (lakes).
 */
// Fixed on-screen size for raster sprites — unlike the vector glyphs (scaled
// from their own 24×24 source) a photographed/painted sprite has no natural
// "map scale", so it's drawn at a constant pixel size at whatever the
// current zoom is, same as the point/marker labels elsewhere in this file.
const RASTER_TARGET_WIDTH = 18

function paintTextureLayers(ctx: CanvasRenderingContext2D, layers: readonly GeoMapTextureLayer[], tileZoom: number, origin: readonly [number, number], resolveColor: ColorResolver, onImageReady: () => void) {
  const toLocalRings = (geometry: GeoGeometry): ScreenRing[] => rings(geometry).map((ring) => ring.map((point) => {
    const [x, y] = worldPoint(point, tileZoom)
    return [x - origin[0], y - origin[1]] as const
  }))
  for (const layer of layers) {
    const screenRings = layer.geometries.flatMap(toLocalRings)
    const excludeScreenRings = (layer.excludeGeometries ?? []).flatMap(toLocalRings)
    const neighborScreenRings = (layer.neighborGeometries ?? []).flatMap(toLocalRings)
    if (!screenRings.length) continue
    const bounds = ringsBounds(screenRings)
    if (!Number.isFinite(bounds.minX)) continue

    const rasterSet = RASTER_ASSETS[layer.kind]
    if (!rasterSet) continue
    const fadeAt = buildEdgeFade(neighborScreenRings, EDGE_FADE_DISTANCE_PX)
    const rand = mulberry32(layer.seed ?? 1)
    const cols = Math.min(260, Math.max(1, Math.round((bounds.maxX - bounds.minX) / rasterSet.cell)))
    const rows = Math.min(260, Math.max(1, Math.round((bounds.maxY - bounds.minY) / rasterSet.cell)))

    const clip = new Path2D()
    for (const ring of [...screenRings, ...excludeScreenRings]) {
      clip.moveTo(ring[0]![0], ring[0]![1])
      for (const [x, y] of ring.slice(1)) clip.lineTo(x, y)
      clip.closePath()
    }
    ctx.save()
    ctx.clip(clip, "evenodd")
    ctx.strokeStyle = resolveColor(layer.color)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    for (let gy = 1; gy < rows - 1; gy += rasterSet.step) {
      for (let gx = 1; gx < cols - 1; gx += rasterSet.step) {
        const cellX = bounds.minX + gx * rasterSet.cell
        const cellY = bounds.minY + gy * rasterSet.cell
        const fade = fadeAt ? fadeAt(cellX, cellY) : 1
        if (fade <= 0 || rand() > rasterSet.keep * fade) continue
        const jx = gx + (rand() - 0.5) * rasterSet.step * 1.1
        const jy = gy + (rand() - 0.5) * rasterSet.step * 1.1
        const x = bounds.minX + jx * rasterSet.cell
        const y = bounds.minY + jy * rasterSet.cell
        const useThin = fade < 1 && rand() > fade
        const sprite = (useThin && rasterSet.thin) || rasterSet.variants[Math.floor(rand() * rasterSet.variants.length)]!
        const image = getImage(sprite, onImageReady)
        if (!image) continue
        const width = RASTER_TARGET_WIDTH * (0.78 + rand() * 0.32)
        const height = width * (sprite.height / sprite.width)
        ctx.globalAlpha = 0.42 + rand() * 0.3
        ctx.drawImage(image, x - width / 2, y - height, width, height)
        ctx.globalAlpha = 1
      }
    }
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

export function GeoMapCanvas({ initialView, focusGeometry, layers, textureLayers = [], points = [], markers = [], selectedPoint, onMapClick, onPointClick, onViewportChange, onZoomChange, title, backgroundFill = "var(--surface)" }: {
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
  /** Painted under every layer, full-canvas — a cheap stand-in for whatever
   * expensive base polygon (e.g. a country outline) would otherwise be
   * needed just to give the land a background tone. See SwedenOutlineMapCanvas. */
  backgroundFill?: string
}) {
  const [view, setView] = useState<View>({ lng: initialView.center[0], lat: initialView.center[1], zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialView.zoom)) })
  const [canvasSize, setCanvasSize] = useState({ width: WIDTH, height: HEIGHT })
  // Skalstockens referenslatitud låses till startvyn (se ScaleBar/SVG-kartan)
  // — annars hoppar både längd och etikett vid varje pan trots oförändrad zoom.
  const scaleLatitude = useRef(initialView.center[1]).current
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  // Panorering under drag rör sig via denna ref, INTE via `setView` — att
  // trigga en React-omrendering (och därmed effekterna nedan) 60 ggr/s var
  // den ursprungliga SVG-kartans akilleshäl. Här ritas varje bildruta
  // direkt mot canvasen i en rAF-loop; `view` (React state) uppdateras bara
  // en gång, när draget släpps.
  const livePan = useRef({ x: 0, y: 0 })
  const panFrame = useRef<number | null>(null)
  const worldBitmap = useRef<WorldBitmap | null>(null)
  const hitTargets = useRef<HitTarget[]>([])
  const resolveColorRef = useRef<ColorResolver>((value) => value)
  const fontFamilyRef = useRef("Georgia, serif")

  const tileZoom = Math.round(view.zoom)
  const center = useMemo(() => worldPoint([view.lng, view.lat], tileZoom), [view.lng, view.lat, tileZoom])
  const unproject = useCallback((x: number, y: number): GeoPosition => positionFromWorld(center[0] + x - WIDTH / 2, center[1] + y - HEIGHT / 2, tileZoom), [center, tileZoom])

  const canvasAspectRatio = canvasSize.height > 0 ? canvasSize.width / canvasSize.height : WIDTH / HEIGHT
  const visibleWidth = Math.min(WIDTH, HEIGHT * canvasAspectRatio)
  const visibleHeight = Math.min(HEIGHT, WIDTH / canvasAspectRatio)
  const visibleX = (WIDTH - visibleWidth) / 2
  const visibleY = (HEIGHT - visibleHeight) / 2
  const visibleFrame = useRef({ x: visibleX, y: visibleY, width: visibleWidth, height: visibleHeight })
  visibleFrame.current = { x: visibleX, y: visibleY, width: visibleWidth, height: visibleHeight }

  // --- Per-frame draw: bitmap blit (pan) + the small, cheap overlay
  // (focus outline, markers, points) that must track the live pan offset.
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const frame = visibleFrame.current
    const scale = (canvas.width / dpr) / frame.width

    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -frame.x * dpr * scale, -frame.y * dpr * scale)
    ctx.clearRect(frame.x, frame.y, frame.width, frame.height)
    ctx.fillStyle = resolveColorRef.current(backgroundFill)
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    const effectiveCenterX = center[0] - livePan.current.x
    const effectiveCenterY = center[1] - livePan.current.y
    const effectiveProject = (point: GeoPosition): readonly [number, number] => {
      const [x, y] = worldPoint(point, tileZoom)
      return [WIDTH / 2 + x - effectiveCenterX, HEIGHT / 2 + y - effectiveCenterY]
    }

    const bitmap = worldBitmap.current
    if (bitmap) {
      const drawX = bitmap.originX - effectiveCenterX + WIDTH / 2
      const drawY = bitmap.originY - effectiveCenterY + HEIGHT / 2
      ctx.drawImage(bitmap.canvas, drawX, drawY)
    }

    if (focusGeometry) {
      const path = new Path2D(geometryPath(focusGeometry, effectiveProject))
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.strokeStyle = resolveColorRef.current("var(--surface)")
      ctx.lineWidth = 2
      ctx.stroke(path)
      ctx.strokeStyle = "#4A3526"
      ctx.lineWidth = 0.85
      ctx.stroke(path)
    }

    const visibleMarkers = tileZoom <= 5 ? markers.slice(0, 5) : markers
    for (const marker of visibleMarkers) {
      const [x, y] = effectiveProject(marker.coordinates)
      ctx.fillStyle = "#4A3526"
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
      if (marker.label) {
        ctx.font = `italic ${tileZoom <= 5 ? 10 : 12}px ${fontFamilyRef.current}`
        ctx.strokeStyle = resolveColorRef.current("var(--surface)")
        ctx.lineWidth = 2
        ctx.strokeText(marker.label, x + 4, y + 3)
        ctx.fillText(marker.label, x + 4, y + 3)
      }
    }

    const targets: HitTarget[] = []
    if (tileZoom >= 9) {
      const grouped = new Map<string, GeoMapPoint[]>()
      for (const point of points) {
        const key = `${point.coordinates[0]},${point.coordinates[1]}`
        const bucket = grouped.get(key) ?? []
        bucket.push(point)
        grouped.set(key, bucket)
      }
      for (const pts of grouped.values()) {
        const [x, y] = effectiveProject(pts[0]!.coordinates)
        ctx.font = "italic bold 16px Georgia, serif"
        ctx.textAlign = "center"
        const splitAt = Math.ceil(pts.length / 2)
        const rows = [pts.slice(0, splitAt), pts.slice(splitAt)]
        rows.forEach((row, rowIndex) => {
          if (!row.length) return
          const text = row.map((point) => point.label ?? "").join("  ")
          const textY = y - 8 + rowIndex * 19
          ctx.lineWidth = 3
          ctx.strokeStyle = resolveColorRef.current("var(--surface)")
          ctx.strokeText(text, x, textY)
          // Canvas text can't tint individual words like the SVG version's
          // per-<tspan> fill did — the whole row is highlighted together
          // when it contains the selected point.
          ctx.fillStyle = row.some((point) => selectedPoint && String(point.id) === String(selectedPoint.id)) ? resolveColorRef.current("var(--accent)") : "#000"
          ctx.fillText(text, x, textY)
        })
        targets.push({ x, y: y - 8, radius: 14, point: pts[0]! })
      }
    }
    ctx.textAlign = "start"
    hitTargets.current = targets
  }, [backgroundFill, center, focusGeometry, markers, points, selectedPoint, tileZoom])

  // --- World bitmap: the expensive part (thousands of texture glyphs, big
  // land-cover polygons) is rasterized ONCE per zoom/data change, not once
  // per pointermove. Panning just blits this bitmap at a different offset.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    fontFamilyRef.current = resolveFontFamily(canvas, "--font-display", "Georgia, serif")
    if (layers.length === 0 && textureLayers.length === 0) { worldBitmap.current = null; draw(); return }
    const resolveColor = createColorResolver(canvas)
    resolveColorRef.current = resolveColor

    // The bitmap's world-space window is sized around the CURRENT view, not
    // around the data's own extent — `layers` always includes the whole-
    // Sweden outline/lake polygons (drawn as a backdrop at every zoom, see
    // SwedenOutlineMapCanvas), and at a locale's high zoom that polygon's
    // world-pixel extent is enormous (the whole country at ~1px/metre) even
    // though almost none of it is ever visible. Sizing the canvas to fit it
    // anyway silently produced a blank map — browsers cap canvas
    // width/height (and total area), so the allocation was failing quietly.
    // A fixed margin around the viewport is enough to pan smoothly without
    // needing a rebuild, and anything further away is simply never drawn —
    // Path2D content outside the canvas bounds costs nothing to skip.
    const [centerX, centerY] = worldPoint([view.lng, view.lat], tileZoom)
    const marginX = WIDTH * 1.5
    const marginY = HEIGHT * 1.5
    const minX = centerX - marginX
    const minY = centerY - marginY
    const maxX = centerX + marginX
    const maxY = centerY + marginY

    // Raster sprites (see raster-assets.ts) load asynchronously — the first
    // build may run before one has finished loading, in which case that
    // instance is just skipped for now. `rebuild` is handed to the image
    // cache as its ready-callback, so the bitmap gets redrawn (this time
    // with the sprite available) once loading actually completes, instead
    // of leaving gaps until the next unrelated data/zoom change.
    let cancelled = false
    const rebuild = () => {
      if (cancelled) return
      const bitmap = document.createElement("canvas")
      bitmap.width = Math.max(1, Math.ceil(maxX - minX))
      bitmap.height = Math.max(1, Math.ceil(maxY - minY))
      const ctx = bitmap.getContext("2d")
      if (!ctx) return
      paintLayers(ctx, layers, tileZoom, [minX, minY], resolveColor)
      paintTextureLayers(ctx, textureLayers, tileZoom, [minX, minY], resolveColor, rebuild)
      worldBitmap.current = { canvas: bitmap, originX: minX, originY: minY }
      draw()
    }
    rebuild()
    return () => { cancelled = true }
    // Rebuilding must NOT depend on `draw` itself (it changes whenever
    // selectedPoint/focusGeometry/etc. change) — only on the data that
    // actually needs re-rasterizing. `draw()` above always calls the latest
    // closure regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, textureLayers, tileZoom])

  useEffect(() => { draw() }, [draw])

  // --- Viewport reporting (after drag ends, not per frame — a heavy
  // land-cover refetch on every pointermove would defeat the whole point).
  useEffect(() => {
    if (!onViewportChange) return
    if (drag.current) return
    const [minLng, maxLat] = unproject(0, 0)
    const [maxLng, minLat] = unproject(WIDTH, HEIGHT)
    onViewportChange([minLng, minLat, maxLng, maxLat])
  }, [onViewportChange, unproject])
  useEffect(() => { onZoomChange?.(tileZoom) }, [onZoomChange, tileZoom])

  // --- Zoom & pan ------------------------------------------------------------
  const eventPointFromClient = useCallback((clientX: number, clientY: number): readonly [number, number] => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return [WIDTH / 2, HEIGHT / 2]
    const frame = visibleFrame.current
    return [frame.x + ((clientX - rect.left) / rect.width) * frame.width, frame.y + ((clientY - rect.top) / rect.height) * frame.height]
  }, [])

  const zoomBy = useCallback((increment: number, anchor?: readonly [number, number]) => setView((current) => {
    const currentZoom = Math.round(current.zoom)
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + increment))
    if (nextZoom === currentZoom) return current
    const frame = visibleFrame.current
    const anchorPoint = anchor ?? [frame.x + frame.width / 2, frame.y + frame.height / 2]
    const [centerX, centerY] = worldPoint([current.lng, current.lat], currentZoom)
    const [anchorLng, anchorLat] = positionFromWorld(centerX + anchorPoint[0] - WIDTH / 2, centerY + anchorPoint[1] - HEIGHT / 2, currentZoom)
    const [anchorX, anchorY] = worldPoint([anchorLng, anchorLat], nextZoom)
    const [lng, lat] = positionFromWorld(anchorX - anchorPoint[0] + WIDTH / 2, anchorY - anchorPoint[1] + HEIGHT / 2, nextZoom)
    return { lng, lat, zoom: nextZoom }
  }), [])

  const commitPan = useCallback(() => {
    const { x: dx, y: dy } = livePan.current
    livePan.current = { x: 0, y: 0 }
    if (dx === 0 && dy === 0) return
    setView((current) => {
      const [worldX, worldY] = worldPoint([current.lng, current.lat], Math.round(current.zoom))
      const [lng, lat] = positionFromWorld(worldX - dx, worldY - dy, Math.round(current.zoom))
      return { ...current, lng, lat }
    })
  }, [])

  useEffect(() => {
    const node = canvasRef.current
    if (!node) return
    const handleWheel = (event: globalThis.WheelEvent) => { event.preventDefault(); zoomBy(event.deltaY < 0 ? 1 : -1, eventPointFromClient(event.clientX, event.clientY)) }
    node.addEventListener("wheel", handleWheel, { passive: false })
    return () => node.removeEventListener("wheel", handleWheel)
  }, [eventPointFromClient, zoomBy])

  useEffect(() => {
    const node = canvasRef.current
    if (!node) return
    const updateSize = () => {
      const width = node.clientWidth
      const height = node.clientHeight
      const dpr = window.devicePixelRatio || 1
      node.width = Math.max(1, Math.round(width * dpr))
      node.height = Math.max(1, Math.round(height * dpr))
      setCanvasSize((current) => current.width === width && current.height === height ? current : { width, height })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => () => { if (panFrame.current !== null) window.cancelAnimationFrame(panFrame.current) }, [])
  useEffect(() => { draw() }, [canvasSize, draw])

  const hitTest = (x: number, y: number): GeoMapPoint | null => {
    for (const target of hitTargets.current) {
      if (Math.hypot(x - target.x, y - target.y) <= target.radius) return target.point
    }
    return null
  }

  // Låst till ljust läge: den handritade texturen är inte tillräckligt bra
  // ännu för att motivera att stödja mörkt läge också (se
  // canvas-map-handoff), så kartan tvingas till samma `data-mode="light"`
  // som resten av appens tokens-system redan förstår — oavsett vad
  // resten av sidan står i (system-/explicit mörkt läge).
  return <div data-theme="tempus" data-mode="light" className="relative flex h-full min-h-0 flex-col overflow-hidden bg-surface">
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={title}
      className="block h-full w-full min-h-0 flex-1 touch-none select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      onPointerDown={(event: ReactPointerEvent<HTMLCanvasElement>) => { const [x, y] = eventPointFromClient(event.clientX, event.clientY); drag.current = { x, y, moved: false }; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={(event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!drag.current) return
        const [x, y] = eventPointFromClient(event.clientX, event.clientY)
        const dx = x - drag.current.x
        const dy = y - drag.current.y
        if (Math.abs(dx) + Math.abs(dy) > 2) drag.current.moved = true
        drag.current = { ...drag.current, x, y }
        livePan.current.x += dx
        livePan.current.y += dy
        if (panFrame.current !== null) return
        panFrame.current = window.requestAnimationFrame(() => { panFrame.current = null; draw() })
      }}
      onPointerUp={(event: ReactPointerEvent<HTMLCanvasElement>) => {
        const moved = drag.current?.moved
        drag.current = null
        if (panFrame.current !== null) { window.cancelAnimationFrame(panFrame.current); panFrame.current = null }
        if (moved) {
          commitPan()
        } else {
          const [x, y] = eventPointFromClient(event.clientX, event.clientY)
          const hit = hitTest(x, y)
          if (hit && onPointClick) onPointClick(hit)
          else onMapClick?.(unproject(x, y))
        }
      }}
    />
    {/* Fast "kartkant"-chrome (kompass, skalstock) ovanpå canvasen. Dessa
        ritas fortfarande som SVG — de är ett fåtal element som aldrig
        behöver panoreras med kartan, så det finns ingen prestandaanledning
        att flytta dem till canvas, och SVG:n återanvänder komponenterna från
        den ursprungliga kartan rakt av. */}
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
      <CompassRose x={visibleX + 78} y={visibleY + visibleHeight - 100} />
      <g pointerEvents="auto"><ScaleBar lat={scaleLatitude} zoom={tileZoom} x={visibleX + 160} y={visibleY + visibleHeight - 62} /></g>
    </svg>
    <div className="absolute bottom-3 right-3 flex border border-border-strong bg-surface/90 font-display text-lg text-accent">
      <button type="button" onClick={() => zoomBy(1)} className="border-r border-border px-2 py-0.5 hover:bg-accent-wash" aria-label="Zooma in">+</button>
      <button type="button" onClick={() => zoomBy(-1)} className="px-2 py-0.5 hover:bg-accent-wash" aria-label="Zooma ut">−</button>
    </div>
  </div>
}
