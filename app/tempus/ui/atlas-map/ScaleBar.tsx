"use client"

const NICE_STEPS = [1, 2, 5]
const TARGET_PIXEL_WIDTH = 110

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

export function ScaleBar({ metersPerPixel }: { metersPerPixel: number }) {
  const distance = niceDistance(metersPerPixel * TARGET_PIXEL_WIDTH)
  const widthPx = distance / metersPerPixel
  return <div className="absolute bottom-5 right-5 z-20 flex flex-col items-center gap-1" aria-hidden="true">
    <div style={{ width: widthPx }} className="h-1.5 border border-[#4a3526]/80 bg-[#fbf8f0]/90" />
    <span className="font-display text-[10px] italic text-[#4a3526]">{formatDistance(distance)}</span>
  </div>
}
