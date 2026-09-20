"use client"

import { useState } from "react"

const NICE_STEPS = [1, 2, 5]
const TARGET_PIXEL_WIDTH = 110
const SCALE_UNITS = [
  { key: "metric", label: "metric", metres: 1 },
  { key: "alnar", label: "alnar", metres: 0.5938 },
  { key: "fjardingsvag", label: "fjärdingsväg", metres: 2672 },
  { key: "stenkast", label: "stenkast", metres: 50 },
  { key: "mil", label: "mil", metres: 10688 },
] as const

// Largest "nice" number (1/2/5 × 10^n) that still fits within maxMetres —
// the standard cartographic scale-bar convention, so the label reads as a
// round distance instead of an arbitrary one.
function niceDistance(maxMetres: number): number {
  if (!Number.isFinite(maxMetres) || maxMetres <= 0) return 1
  const exponent = Math.floor(Math.log10(maxMetres))
  let best = 10 ** exponent
  for (const step of NICE_STEPS) {
    const candidate = step * 10 ** exponent
    if (candidate <= maxMetres) best = candidate
  }
  return best
}

function formatDistance(metres: number): string {
  return metres >= 1000 ? `${metres / 1000} km` : `${metres} m`
}

function formatHistoricDistance(value: number, unit: (typeof SCALE_UNITS)[number]) {
  const maximumFractionDigits = value >= 10 ? 0 : value >= 1 ? 1 : 2
  return `${new Intl.NumberFormat("sv-SE", { maximumFractionDigits }).format(value)} ${unit.label}`
}

export function ScaleBar({ metersPerPixel }: { metersPerPixel: number }) {
  const [unitIndex, setUnitIndex] = useState(0)
  const unit = SCALE_UNITS[unitIndex]
  const unitDistance = niceDistance((metersPerPixel * TARGET_PIXEL_WIDTH) / unit.metres)
  const distance = unitDistance * unit.metres
  const widthPx = distance / metersPerPixel
  const label = unit.key === "metric" ? formatDistance(distance) : formatHistoricDistance(unitDistance, unit)

  return <button
    type="button"
    onClick={() => setUnitIndex((current) => (current + 1) % SCALE_UNITS.length)}
    className="absolute bottom-5 right-5 z-20 flex cursor-pointer flex-col items-center gap-1 text-[#4a3526] outline-offset-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#4a3526]"
    aria-label={`Byt skalenhet. Visar ${label}.`}
  >
    <div style={{ width: widthPx }} className="h-1.5 border border-[#4a3526]/80 bg-[#fbf8f0]/90" />
    <span className="font-display text-[10px] italic">{label}</span>
  </button>
}
