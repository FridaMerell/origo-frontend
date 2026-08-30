"use client"

import { useMemo } from "react"
import { SwedenMap } from "@/app/tempus/ui/biotope-map/SwedenMap"
import type { TempusRouteGeometry, TempusRouteStop } from "@/app/lib/dal"
import { createRouteProjection } from "./projection"

export type RouteMapMarker = {
  id: string
  coordinates: [number, number]
  label: string
  rank?: number
}

export function RouteMap({
  geometry,
  stops = [],
  suggestions = [],
  activeId,
  width = 460,
  height = 690,
  padding = 24,
  frame = true,
  className,
}: {
  geometry: TempusRouteGeometry | null
  stops?: TempusRouteStop[]
  suggestions?: RouteMapMarker[]
  activeId?: string | null
  width?: number
  height?: number
  padding?: number
  frame?: boolean
  className?: string
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
    <div
      className={[
        "relative overflow-hidden",
        frame ? "rounded border border-border" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <SwedenMap
        width={width}
        height={height}
        padding={padding}
        className="block h-auto w-full"
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {linePoints.length > 1 ? (
          <polyline
            points={linePoints.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="var(--color-accent, #8f4932)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {suggestions.map((marker) => {
          const [x, y] = projection.toMap(marker.coordinates)
          const active = marker.id === activeId
          return (
            <g key={`suggestion-${marker.id}`} transform={`translate(${x} ${y})`}>
              <circle
                r={active ? 8 : 6}
                fill="var(--surface, white)"
                stroke="var(--color-accent, #8f4932)"
                strokeWidth={1.75}
                vectorEffect="non-scaling-stroke"
              />
              {typeof marker.rank === "number" ? (
                <text
                  textAnchor="middle"
                  dy="3"
                  fontSize={8}
                  fontFamily="ui-monospace, monospace"
                  fill="var(--color-accent, #8f4932)"
                >
                  {marker.rank}
                </text>
              ) : null}
              <title>{marker.label}</title>
            </g>
          )
        })}

        {stops.map((stop, index) => {
          if (stop.location?.type !== "Point") return null
          const [x, y] = projection.toMap(stop.location.coordinates)
          return (
            <g key={`stop-${stop.id}`} transform={`translate(${x} ${y})`}>
              <circle
                r={7}
                fill="var(--color-accent, #8f4932)"
                stroke="var(--surface, white)"
                strokeWidth={1.75}
                vectorEffect="non-scaling-stroke"
              />
              <text
                textAnchor="middle"
                dy="3"
                fontSize={8}
                fontFamily="ui-monospace, monospace"
                fill="var(--accent-contrast, white)"
              >
                {stop.sequence || index + 1}
              </text>
              <title>{stop.name}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
