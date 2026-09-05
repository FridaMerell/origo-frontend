"use client"

import { useMemo } from "react"
import { SwedenMap } from "@/app/tempus/ui/biotope-map/SwedenMap"
import type { RouteLineString } from "@/app/lib/schemas"
import { createRouteProjection } from "./projection"

type LonLat = [number, number]

/** Renders the planned route line over the Sweden map, matching RouteMap. */
export function RoutePreview({
  geometry,
  endpoints,
  width = 460,
  height = 690,
  padding = 24,
}: {
  geometry: RouteLineString | null
  endpoints: LonLat[]
  width?: number
  height?: number
  padding?: number
}) {
  const projection = useMemo(
    () => createRouteProjection(width, height, padding),
    [width, height, padding],
  )
  const linePoints =
    geometry && geometry.coordinates.length > 1
      ? geometry.coordinates.map((position) => projection.toMap(position))
      : []

  return (
    <div className="relative overflow-hidden rounded border border-border">
      <SwedenMap
        width={width}
        height={height}
        padding={padding}
        className="block h-auto w-full"
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full text-accent"
        aria-hidden
      >
        {linePoints.length > 1 ? (
          <polyline
            points={linePoints.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {endpoints.map((position, index) => {
          const [x, y] = projection.toMap(position)
          return (
            <circle
              key={`${position[0]}-${position[1]}-${index}`}
              cx={x}
              cy={y}
              r={5}
              fill="currentColor"
              stroke="var(--surface, white)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>
    </div>
  )
}
