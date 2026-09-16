export const SWEDISH_UNITS = {
  aln: 0.5938,
  famn: 1.781,
  fjardingsvag: 2672,
  lantmil: 10688,
  tunnland: 4936.6,
} as const

const OLD_SCALE_STEPS = [
  { meters: SWEDISH_UNITS.aln * 10, label: "10 aln" },
  { meters: SWEDISH_UNITS.aln * 50, label: "50 aln" },
  { meters: SWEDISH_UNITS.famn * 100, label: "100 famn" },
  { meters: SWEDISH_UNITS.fjardingsvag, label: "1 fjärdingsväg" },
  { meters: SWEDISH_UNITS.lantmil, label: "1 lantmil" },
  { meters: SWEDISH_UNITS.lantmil * 2, label: "2 lantmil" },
] as const

const MODERN_SCALE_STEPS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000] as const

export function scaleForPixels(metersPerPixel: number, historic: boolean, maxPixels = 150) {
  const limit = metersPerPixel * maxPixels
  if (historic) {
    let scale: { meters: number; label: string } = OLD_SCALE_STEPS[0]!
    for (const step of OLD_SCALE_STEPS) {
      if (step.meters > limit) break
      scale = step
    }
    return { ...scale, pixels: scale.meters / metersPerPixel }
  }
  let meters: number = MODERN_SCALE_STEPS[0]!
  for (const step of MODERN_SCALE_STEPS) {
    if (step > limit) break
    meters = step
  }
  return { meters, label: meters >= 1000 ? `${meters / 1000} km` : `${meters} m`, pixels: meters / metersPerPixel }
}

export function formatHistoricArea(squareMeters: number) {
  const hectares = squareMeters / 10_000
  const tunnland = squareMeters / SWEDISH_UNITS.tunnland
  // Markland was historically a tax unit whose actual area varied by district.
  // The map therefore uses one tunnland as its explicit, comparable base.
  const markland = tunnland
  return {
    hectares: `${hectares.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} ha`,
    tunnland: `${tunnland.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} tunnland`,
    markland: `${markland.toLocaleString("sv-SE", { maximumFractionDigits: 2 })} markland`,
    oresland: `${(markland * 8).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} öresland`,
    ortugsland: `${(markland * 24).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} örtugsland`,
    penningland: `${(markland * 192).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} penningland`,
  }
}
