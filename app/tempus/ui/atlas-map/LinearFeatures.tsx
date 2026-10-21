"use client"

import { useEffect, useRef } from "react"
import type { Map as MaplibreMap } from "maplibre-gl"
import type { BuildingFeature, HydrographyFeature, RoadFeature } from "@/app/lib/land-cover"
import { WATER_FILL_COLOR, WATER_LINE_COLOR } from "./land-cover-kinds"

type Position = readonly [number, number]
type Path = readonly Position[]

const ROAD_CASING_COLOR = "rgba(95, 72, 44, 0.85)"
const ROAD_FILL_COLOR = "#fbf8f0"
const COASTLINE_COLOR = "rgba(63, 98, 104, 0.9)"

// Vattnets mönster: handritade vågrätta streck (public/tempus/map-textures).
// Mönstret klipps till sjöarna och ritas ovanpå vattenfärgen, under strandlinjen.
const WATER_PATTERN_SRC = "/tempus/map-textures/historic-water.png"
// Bilden är 1254 px bred; skalan avgör hur tätt strecken ligger på skärmen.
const WATER_PATTERN_SCALE = 0.5
const WATER_PATTERN_ALPHA = 0.6

let waterImage: HTMLImageElement | null = null
const waterWaiting = new Set<() => void>()

// Bilden hämtas en gång för hela sidan; den som ritar före att den är klar
// registreras och får en ny ritning när den har laddats.
function getWaterImage(onReady: () => void): HTMLImageElement | null {
  if (!waterImage) {
    const image = new Image()
    image.onload = () => {
      for (const callback of waterWaiting) callback()
      waterWaiting.clear()
    }
    image.src = WATER_PATTERN_SRC
    waterImage = image
  }
  if (waterImage.complete && waterImage.naturalWidth > 0) return waterImage
  waterWaiting.add(onReady)
  return null
}

function linesOf(geometry: HydrographyFeature["geometry"] | RoadFeature["geometry"] | BuildingFeature["geometry"]): Path[] {
  if (geometry.type === "LineString") return [geometry.coordinates]
  if (geometry.type === "MultiLineString") return [...geometry.coordinates]
  if (geometry.type === "Polygon") return [...geometry.coordinates]
  return geometry.coordinates.flat()
}

function tracePaths(context: CanvasRenderingContext2D, map: MaplibreMap, paths: readonly Path[], closed: boolean) {
  context.beginPath()
  for (const path of paths) {
    path.forEach(([lng, lat], index) => {
      const point = map.project([lng, lat])
      if (index === 0) context.moveTo(point.x, point.y)
      else context.lineTo(point.x, point.y)
    })
    if (closed) context.closePath()
  }
}

function strokePaths(context: CanvasRenderingContext2D, map: MaplibreMap, paths: readonly Path[], color: string, width: number) {
  if (!paths.length) return
  tracePaths(context, map, paths, false)
  context.strokeStyle = color
  context.lineWidth = width
  context.stroke()
}

/**
 * Water, roads and buildings from the same land-cover/fetch/ response as everything else
 * on the atlas. Drawn on its own canvas above the raster-texture canvas
 * (JordebokRasterTextures) rather than as MapLibre layers, because that
 * canvas sits over the whole MapLibre canvas — anything MapLibre drew would
 * have forest and field stamps painted across it.
 *
 * Like the raster canvas, it is not redrawn on every frame of a zoom: while the
 * camera moves the finished canvas is moved and scaled with CSS, and it is drawn
 * again once the movement ends. Projecting every vertex of every road and
 * shoreline on every frame was what made zooming heavy.
 */
export function LinearFeatures({ map, hydrography, roads, buildings }: { map: MaplibreMap; hydrography: readonly HydrographyFeature[]; roads: readonly RoadFeature[]; buildings: readonly BuildingFeature[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let frame: number | null = null
    let disposed = false
    let anchor: { location: ReturnType<MaplibreMap["getCenter"]>; point: { x: number; y: number }; zoom: number } | null = null

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.transform = ""
      const context = canvas.getContext("2d")
      if (!context) return
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.lineJoin = "round"
      context.lineCap = "round"

      const zoom = map.getZoom()
      const roadWidth = Math.min(4.5, Math.max(0.9, 0.9 + (zoom - 11) * 0.5))
      const waterWidth = Math.min(3, Math.max(0.8, 0.8 + (zoom - 11) * 0.3))

      const polygonLakes = hydrography.filter((feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
      if (polygonLakes.length) {
        tracePaths(context, map, polygonLakes.flatMap((feature) => linesOf(feature.geometry)), true)
        context.fillStyle = WATER_FILL_COLOR
        context.fill("evenodd")

        const image = getWaterImage(schedule)
        const pattern = image ? context.createPattern(image, "repeat") : null
        if (pattern) {
          context.save()
          context.clip("evenodd")
          pattern.setTransform(new DOMMatrix().scale(WATER_PATTERN_SCALE))
          context.globalAlpha = WATER_PATTERN_ALPHA
          context.fillStyle = pattern
          context.fillRect(0, 0, width, height)
          context.restore()
        }

        context.strokeStyle = WATER_LINE_COLOR
        context.lineWidth = 0.9
        context.stroke()
      }

      const isLine = (feature: HydrographyFeature) => feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString"
      strokePaths(context, map, hydrography.filter((feature) => feature.kind === "watercourse" && isLine(feature)).flatMap((feature) => linesOf(feature.geometry)), WATER_LINE_COLOR, waterWidth)
      strokePaths(context, map, hydrography.filter((feature) => feature.kind === "coastline" && isLine(feature)).flatMap((feature) => linesOf(feature.geometry)), COASTLINE_COLOR, Math.max(1, waterWidth))

      const roadPaths = roads.flatMap((feature) => linesOf(feature.geometry))
      strokePaths(context, map, roadPaths, ROAD_CASING_COLOR, roadWidth + 1.6)
      strokePaths(context, map, roadPaths, ROAD_FILL_COLOR, roadWidth)

      if (buildings.length) {
        tracePaths(context, map, buildings.flatMap((feature) => linesOf(feature.geometry)), true)
        context.fillStyle = ROAD_CASING_COLOR
        context.fill("evenodd")
      }
    }

    function schedule() {
      if (frame !== null || disposed || anchor) return
      frame = requestAnimationFrame(() => {
        frame = null
        draw()
      })
    }

    const beginMove = () => {
      const location = map.getCenter()
      anchor = { location, point: map.project(location), zoom: map.getZoom() }
    }

    // Kartan flyttas bara genom zoom (knapparna, fitBounds), men "move" avfyras
    // ändå under animationen: den färdiga duken flyttas och skalas så att den
    // följer kartan utan att ritas om.
    const followMove = () => {
      if (!anchor) return
      const point = map.project(anchor.location)
      const scale = 2 ** (map.getZoom() - anchor.zoom)
      const x = point.x - anchor.point.x * scale
      const y = point.y - anchor.point.y * scale
      canvas.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`
    }

    const finishMove = () => {
      anchor = null
      schedule()
    }

    map.on("movestart", beginMove)
    map.on("move", followMove)
    map.on("moveend", finishMove)
    map.on("resize", schedule)
    schedule()

    return () => {
      disposed = true
      if (frame !== null) cancelAnimationFrame(frame)
      map.off("movestart", beginMove)
      map.off("move", followMove)
      map.off("moveend", finishMove)
      map.off("resize", schedule)
    }
  }, [map, hydrography, roads, buildings])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] h-full w-full" style={{ transformOrigin: "0 0" }} />
}
