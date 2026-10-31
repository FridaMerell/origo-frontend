"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import { MODE_LABELS, formatTime } from "@/app/verso/uppvarmning/heating-log-row"
import { formatDateLong, formatOneDecimal } from "@/app/lib/formatters"
import type { HeatingLog } from "@/app/lib/dal"

const HEIGHT = 360
const MARGIN = { top: 12, right: 52, bottom: 26, left: 36 }
const HOUR = 3_600_000
/** A longer silence than this between two logs breaks the lines instead of drawing across it. */
const MAX_GAP = 2 * HOUR
const TIME_STEPS = [1, 2, 3, 6, 12, 24, 48, 96].map((hours) => hours * HOUR)
const TEMPERATURE_STEPS = [1, 2, 5, 10]
const LABEL_SPACING = 16

const SERIES = [
  { key: "w_avg_temperature", label: "Inne", line: "stroke-primary", swatch: "border-primary" },
  { key: "w_avg_setpoint", label: "Bör", line: "stroke-text [stroke-dasharray:5_4]", swatch: "border-dashed border-text" },
  { key: "outside_temperature", label: "Ute", line: "stroke-secondary", swatch: "border-secondary" },
] as const

const localOffset = (time: number) => new Date(time).getTimezoneOffset() * 60_000

/** The time of day, or the date at midnight so the axis says which day it is on. */
function formatTick(tick: number) {
  const date = new Date(tick)
  return date.getHours() === 0 && date.getMinutes() === 0
    ? date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })
    : formatTime(date.toISOString())
}

/** One path through the points, lifted between logs further apart than MAX_GAP. */
function linePath(points: { time: number; x: number; y: number }[]) {
  return points
    .map((point, index) => {
      const connected = index > 0 && point.time - points[index - 1].time <= MAX_GAP
      return `${connected ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`
    })
    .join("")
}

/** Temperatures and setpoints as lines over time, on one shared °C axis; `logs` may come in any order. */
export function HeatingChart({ logs }: { logs: HeatingLog[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Unknown until mounted, so the first render has no chart and times follow the browser's time zone.
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<HeatingLog | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const times = sorted.map((log) => new Date(log.timestamp).getTime())
  const start = times[0]
  const end = times[times.length - 1]
  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const scaleX = (time: number) => MARGIN.left + (end > start ? ((time - start) / (end - start)) * plotWidth : plotWidth / 2)

  const values = sorted.flatMap((log) => SERIES.map((series) => log[series.key]))
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const step = TEMPERATURE_STEPS.find((candidate) => (rawMax - rawMin) / candidate <= 7) ?? 20
  const min = Math.floor(rawMin / step) * step
  const max = Math.max(Math.ceil(rawMax / step) * step, min + step)
  const scaleY = (value: number) => MARGIN.top + plotHeight - ((value - min) / (max - min)) * plotHeight

  const temperatureTicks: number[] = []
  for (let tick = min; tick <= max; tick += step) temperatureTicks.push(tick)

  // Ticks on whole local hours, as dense as the width allows.
  const timeStep = TIME_STEPS.find((candidate) => ((end - start) / candidate) * 48 <= plotWidth) ?? TIME_STEPS[TIME_STEPS.length - 1]
  const timeTicks: number[] = []
  const offset = localOffset(start)
  for (let tick = Math.ceil((start - offset) / timeStep) * timeStep + offset; tick <= end; tick += timeStep) {
    timeTicks.push(tick)
  }

  // Direct labels at the newest log, pushed apart when their lines end close together.
  const newest = sorted[sorted.length - 1]
  const endLabels = SERIES.map((series) => ({ label: series.label, y: scaleY(newest[series.key]) })).sort((a, b) => a.y - b.y)
  endLabels.forEach((label, index) => {
    if (index > 0) label.y = Math.max(label.y, endLabels[index - 1].y + LABEL_SPACING)
  })

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const pointer = event.clientX - event.currentTarget.getBoundingClientRect().left
    let nearest = 0
    times.forEach((time, index) => {
      if (Math.abs(scaleX(time) - pointer) < Math.abs(scaleX(times[nearest]) - pointer)) nearest = index
    })
    setActive(sorted[nearest])
  }

  const activeX = active ? scaleX(new Date(active.timestamp).getTime()) : 0
  const shown = active ?? newest

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* The legend doubles as the readout, above the plot so it never covers a line: the newest log until one is pointed at. */}
      {width > 0 && (
        <div className="flex flex-col gap-1.5 text-sm text-text-muted">
          <div className="flex flex-wrap justify-between gap-x-4 tabular-nums">
            <span className="font-medium text-text">
              {formatDateLong(shown.timestamp)} {formatTime(shown.timestamp)}
            </span>
            {shown.mode !== null && <span>{MODE_LABELS[shown.mode]}</span>}
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
            {SERIES.map((series) => (
              <li key={series.key} className="flex items-center gap-1.5 tabular-nums">
                <span className={`w-5 border-t-2 ${series.swatch}`} />
                {series.label} <span className="text-text">{formatOneDecimal(shown[series.key])} °C</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div ref={containerRef} className="min-w-0">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Inne-, bör- och utetemperatur från ${formatDateLong(sorted[0].timestamp)} till ${formatDateLong(newest.timestamp)}`}
            className="block touch-pan-y"
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => setActive(null)}
          >
            {temperatureTicks.map((tick) => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={scaleY(tick)} y2={scaleY(tick)} className="stroke-border" />
                <text x={MARGIN.left - 8} y={scaleY(tick)} dy="0.32em" textAnchor="end" className="fill-text-muted text-xs tabular-nums">
                  {tick}
                </text>
              </g>
            ))}
            {timeTicks.map((tick) => (
              <text key={tick} x={scaleX(tick)} y={HEIGHT - 6} textAnchor="middle" className="fill-text-muted text-xs tabular-nums">
                {formatTick(tick)}
              </text>
            ))}
            {SERIES.map((series) => (
              <path
                key={series.key}
                d={linePath(sorted.map((log, index) => ({ time: times[index], x: scaleX(times[index]), y: scaleY(log[series.key]) })))}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={series.line}
              />
            ))}
            {endLabels.map((label) => (
              <text key={label.label} x={MARGIN.left + plotWidth + 8} y={label.y} dy="0.32em" className="fill-text-muted text-xs">
                {label.label}
              </text>
            ))}
            {active && (
              <g>
                <line x1={activeX} x2={activeX} y1={MARGIN.top} y2={MARGIN.top + plotHeight} className="stroke-border-strong" />
                {SERIES.map((series) => (
                  <circle key={series.key} cx={activeX} cy={scaleY(active[series.key])} r={4} strokeWidth={2} className={`fill-surface ${series.line.split(" ")[0]}`} />
                ))}
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  )
}
