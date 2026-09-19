"use client"

import { useRef } from "react"
import type { Map as MaplibreMap } from "maplibre-gl"
import type { HydrographyFeature, RoadFeature } from "@/app/lib/land-cover"
import { WATER_FILL_COLOR, WATER_LINE_COLOR } from "./land-cover-kinds"
import { useMapFrame } from "./useMapFrame"

type Position = readonly [number, number]
type Path = readonly Position[]

const ROAD_CASING_COLOR = "rgba(95, 72, 44, 0.85)"
const ROAD_FILL_COLOR = "#fbf8f0"
const COASTLINE_COLOR = "rgba(63, 98, 104, 0.9)"

function linesOf(geometry: HydrographyFeature["geometry"] | RoadFeature["geometry"]): Path[] {
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
 * Water and roads from the same land-cover/fetch/ response as everything else
 * on the atlas. Drawn on its own canvas above the raster-texture canvas
 * (JordebokRasterTextures) rather than as MapLibre layers, because that
 * canvas sits over the whole MapLibre canvas — anything MapLibre drew would
 * have forest and field stamps painted across it.
 */
export function LinearFeatures({ map, hydrography, roads }: { map: MaplibreMap; hydrography: readonly HydrographyFeature[]; roads: readonly RoadFeature[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useMapFrame(map, ["move", "resize"], () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
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
  })

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] h-full w-full" />
}
