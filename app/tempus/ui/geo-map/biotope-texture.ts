import { mulberry32, Noise2D } from "@/app/tempus/ui/biotope-map/noise"
import { marshGlyph, treeGlyph, tuftGlyph } from "@/app/tempus/ui/biotope-map/generate"
import { isoLines, smooth, toPath } from "@/app/tempus/ui/biotope-map/contour"
import { PALETTE } from "@/app/tempus/ui/biotope-map/types"
import type { El } from "@/app/tempus/ui/biotope-map/types"

// ---------------------------------------------------------------------------
// Riktiga marktäckesytor genom biotopkarte-generatorns egna tekniker.
//
// generate.ts bygger sina skogar/ängar genom att (1) lägga en mottlad,
// brusbaserad "wash" under, (2) strö ut treeGlyph/tuftGlyph/marshGlyph ovanpå,
// och för åkermark (3) rita ett roterat rutnät av fårlinjer (`drawParcels`).
// Den här filen kör samma tre tekniker — `Noise2D`/`isoLines`/`smooth`/`toPath`
// är redan generiska och återanvänds oförändrade — mot en given skärmruta.
// Själva avgränsningen mot den riktiga polygonen (och uteslutning av sjöar)
// sköts inte här, utan av anroparen via en SVG `clipPath` runt hela lagret;
// det gör avgränsningen exakt istället för en punktvis approximation, och
// slipper testa varje strödd symbol mot polygonen för hand.
// ---------------------------------------------------------------------------

export type ScreenPoint = readonly [number, number]
export type ScreenRing = readonly ScreenPoint[]
export type ScreenBounds = { minX: number; minY: number; maxX: number; maxY: number }
export type BiotopeTextureKind = "forest" | "meadow" | "marsh" | "parcels"

export function ringsBounds(rings: readonly ScreenRing[]): ScreenBounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const ring of rings) for (const [x, y] of ring) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

function boundsValid(b: ScreenBounds): boolean {
  return Number.isFinite(b.minX) && b.maxX > b.minX && b.maxY > b.minY
}

const CELL = 6
const GLYPH: Record<"forest" | "meadow" | "marsh", typeof treeGlyph> = { forest: treeGlyph, meadow: tuftGlyph, marsh: marshGlyph }
// Samma densitet/steg-formel och "behåll X%"-tröskel som generate.ts (`scatter`)
// använder för respektive kort: boreal=7, sankmark=8, äng/åker=7.
const DENSITY: Record<"forest" | "meadow" | "marsh", number> = { forest: 7, meadow: 7, marsh: 8 }
const KEEP_PROBABILITY: Record<"forest" | "meadow" | "marsh", number> = { forest: 0.85, meadow: 0.65, marsh: 0.8 }
// Hur många skärmpixlar in från en gräns mot en ANNAN marktyp som
// symbolströningen tunnas ut över — se buildEdgeFade nedan. ~4 rutnätsceller
// (CELL) ger en mjuk, men fortfarande kort, övergångszon.
export const EDGE_FADE_DISTANCE_PX = 4 * CELL

/**
 * En billig (vertex-avstånd, inte exakt segment-avstånd) täthetsdämpning
 * nära grannytor av en ANNAN marktyp: 1 = full täthet, avtar linjärt mot 0
 * inom `EDGE_FADE_DISTANCE_PX` av grannens rand. Utan detta slutar en yta
 * med en skarp rät kant exakt vid klippgränsen mot grannytan — verkliga
 * marktäckesövergångar (och 1600-talskartornas förlaga) glesnar istället ut
 * innan de tar slut.
 */
export function buildEdgeFade(neighborRings: readonly ScreenRing[], distance: number): ((x: number, y: number) => number) | null {
  if (!neighborRings.length) return null
  const indexed = neighborRings.map((ring) => ({ ring, bounds: ringsBounds([ring]) }))
  return (x: number, y: number) => {
    let minDist = Infinity
    for (const { ring, bounds } of indexed) {
      if (x < bounds.minX - distance || x > bounds.maxX + distance || y < bounds.minY - distance || y > bounds.maxY + distance) continue
      for (const [rx, ry] of ring) {
        const d = Math.hypot(x - rx, y - ry)
        if (d < minDist) minDist = d
        if (minDist === 0) return 0
      }
    }
    return minDist >= distance ? 1 : minDist / distance
  }
}

function scatterGlyphs(kind: "forest" | "meadow" | "marsh", bounds: ScreenBounds, seed: number, color: string, fadeAt: ((x: number, y: number) => number) | null): El[] {
  const cols = Math.min(260, Math.max(1, Math.round((bounds.maxX - bounds.minX) / CELL)))
  const rows = Math.min(260, Math.max(1, Math.round((bounds.maxY - bounds.minY) / CELL)))
  const rand = mulberry32(seed)
  const step = Math.max(3, 14 - DENSITY[kind])
  const keep = KEEP_PROBABILITY[kind]
  const glyph = GLYPH[kind]
  const ctx: { elements: El[] } = { elements: [] }
  for (let gy = 1; gy < rows - 1; gy += step) {
    for (let gx = 1; gx < cols - 1; gx += step) {
      const cellX = bounds.minX + gx * CELL
      const cellY = bounds.minY + gy * CELL
      const fade = fadeAt ? fadeAt(cellX, cellY) : 1
      if (fade <= 0 || rand() > keep * fade) continue
      const jx = gx + (rand() - 0.5) * step * 1.1
      const jy = gy + (rand() - 0.5) * step * 1.1
      const x = bounds.minX + jx * CELL
      const y = bounds.minY + jy * CELL
      const before = ctx.elements.length
      glyph(ctx, x, y, 0.85 + rand() * 0.4)
      for (let i = before; i < ctx.elements.length; i++) {
        const el = ctx.elements[i]!
        if (el.t === "path") ctx.elements[i] = { ...el, s: color }
      }
    }
  }
  return ctx.elements
}

/**
 * Mottlad, brusbaserad skogsskugga (samma teknik som `drawForestShade` i
 * generate.ts): ett brusfält tröskeltestas med `isoLines` till oregelbundna
 * klumpar, mjukas till med `smooth`, och fylls halvgenomskinligt. Ger skogen
 * djup istället för en helt platt ton.
 */
function buildForestWash(bounds: ScreenBounds, seed: number, color: string): El[] {
  const cell = Math.max(4, Math.min(14, (bounds.maxX - bounds.minX) / 60))
  const cols = Math.min(160, Math.max(4, Math.round((bounds.maxX - bounds.minX) / cell)))
  const rows = Math.min(160, Math.max(4, Math.round((bounds.maxY - bounds.minY) / cell)))
  const rand = mulberry32(seed)
  const noise = new Noise2D(rand)
  const field = new Float32Array(cols * rows)
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) field[y * cols + x] = noise.fbm(x * 0.12, y * 0.12, 3)
  const elements: El[] = []
  for (const raw of isoLines(field, cols, rows, 0.05)) {
    if (raw.length < 10) continue
    const sm = smooth(raw, 2).map(([x, y]): [number, number] => [bounds.minX + x * cell, bounds.minY + y * cell])
    elements.push({ t: "path", d: toPath(sm, true), f: color, s: "none", o: 0.35 })
  }
  return elements
}

/**
 * Roterat rutnät av fårlinjer, som `drawParcels` i generate.ts — åkermarkens
 * egen, primära textur (inte bara utströdda punktsymboler).
 */
function buildParcelHatch(bounds: ScreenBounds, seed: number, color: string): El[] {
  const rand = mulberry32(seed)
  const w = bounds.maxX - bounds.minX
  const h = bounds.maxY - bounds.minY
  const cx = bounds.minX + w / 2
  const cy = bounds.minY + h / 2
  const diag = Math.hypot(w, h)
  const angle = (rand() - 0.5) * 0.5
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const rotate = (x: number, y: number): [number, number] => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]
  const gap = Math.max(14, Math.min(60, diag / 14)) + rand() * 10
  const elements: El[] = []
  for (let gx = -diag; gx < diag * 2; gx += gap) {
    const jitter = (rand() - 0.5) * gap * 0.15
    const [ax, ay] = rotate(bounds.minX + gx + jitter, bounds.minY - diag)
    const [bx, by] = rotate(bounds.minX + gx + jitter, bounds.minY + diag * 2)
    elements.push({ t: "path", d: toPath([[ax, ay], [bx, by]]), s: color, w: 0.7, f: "none", o: 0.4 })
  }
  for (let gy = -diag; gy < diag * 2; gy += gap * (1.2 + rand() * 0.5)) {
    const [ax, ay] = rotate(bounds.minX - diag, bounds.minY + gy)
    const [bx, by] = rotate(bounds.minX + diag * 2, bounds.minY + gy)
    elements.push({ t: "path", d: toPath([[ax, ay], [bx, by]]), s: color, w: 0.6, f: "none", o: 0.3, dash: rand() > 0.6 ? "5 4" : undefined })
  }
  return elements
}

/**
 * Bygger den handritade marktäckestexturen för en given skärmruta. Själva
 * polygon-avgränsningen (inkl. uteslutna sjöar) görs INTE här — den sköts av
 * en SVG `clipPath` runt hela laget hos anroparen, se GeoMapCanvas.
 *
 * `neighborRings` är valfri (befintliga anrop utan den beter sig exakt som
 * förut) — rand av ANDRA marktypers ytor, som glesar ut symbolströningen nära
 * gränsen mot dem. Se `buildEdgeFade`.
 */
export function buildBiotopeTexture(kind: BiotopeTextureKind, rings: readonly ScreenRing[], seed: number, color: string, neighborRings?: readonly ScreenRing[]): El[] {
  const bounds = ringsBounds(rings)
  if (!boundsValid(bounds)) return []
  const fadeAt = buildEdgeFade(neighborRings ?? [], EDGE_FADE_DISTANCE_PX)
  if (kind === "parcels") return [...buildParcelHatch(bounds, seed, color), ...scatterGlyphs("meadow", bounds, seed + 1, color, fadeAt)]
  if (kind === "forest") return [...buildForestWash(bounds, seed, PALETTE.forest), ...scatterGlyphs("forest", bounds, seed + 1, color, fadeAt)]
  return scatterGlyphs(kind, bounds, seed, color, fadeAt)
}
