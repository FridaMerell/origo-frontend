import type { DrawingArea, DrawingElement, DrawingUnit } from "@/app/lib/dal"

export type Pt = { x: number; y: number }

export const distance = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y)

/** Smallest 1/2/5 x 10^n step that is >= min. */
export function niceStep(min: number): number {
  if (!(min > 0)) return 1
  const pow = 10 ** Math.floor(Math.log10(min))
  for (const m of [1, 2, 5, 10]) {
    if (m * pow >= min) return m * pow
  }
  return 10 * pow
}

export const snapToGrid = (p: Pt, step: number): Pt => ({
  x: Math.round(p.x / step) * step,
  y: Math.round(p.y / step) * step,
})

/** Rounds `to` onto the nearest 45 degree ray from `from`. */
export function constrainAngle(from: Pt, to: Pt): Pt {
  const len = distance(from, to)
  const angle = Math.round(Math.atan2(to.y - from.y, to.x - from.x) / (Math.PI / 4)) * (Math.PI / 4)
  return { x: from.x + Math.cos(angle) * len, y: from.y + Math.sin(angle) * len }
}

/** Points other elements can be snapped to. */
export function elementAnchors(el: DrawingElement): Pt[] {
  switch (el.type) {
    case "line":
    case "dimension":
      return [
        { x: el.x1, y: el.y1 },
        { x: el.x2, y: el.y2 },
      ]
    case "polyline":
      return el.points
    case "polygon":
      return el.points.map(([x, y]) => ({ x, y }))
    case "rect":
      return [
        { x: el.x, y: el.y },
        { x: el.x + el.width, y: el.y },
        { x: el.x + el.width, y: el.y + el.height },
        { x: el.x, y: el.y + el.height },
      ]
    case "ellipse":
      return [{ x: el.cx, y: el.cy }]
    case "text":
    case "note":
      return [{ x: el.x, y: el.y }]
  }
}

export function nearestAnchor(p: Pt, elements: DrawingElement[], maxDistance: number): Pt | null {
  let best: Pt | null = null
  let bestDistance = maxDistance
  for (const el of elements) {
    for (const anchor of elementAnchors(el)) {
      const d = distance(p, anchor)
      if (d <= bestDistance) {
        best = anchor
        bestDistance = d
      }
    }
  }
  return best
}

export function translateElement(el: DrawingElement, dx: number, dy: number): DrawingElement {
  switch (el.type) {
    case "line":
    case "dimension":
      return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy }
    case "polyline":
      return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
    case "polygon":
      return { ...el, points: el.points.map(([x, y]): [number, number] => [x + dx, y + dy]) }
    case "rect":
      return { ...el, x: el.x + dx, y: el.y + dy }
    case "ellipse":
      return { ...el, cx: el.cx + dx, cy: el.cy + dy }
    case "text":
    case "note":
      return { ...el, x: el.x + dx, y: el.y + dy }
  }
}

const UNIT_DECIMALS: Record<DrawingUnit, number> = { mm: 0, cm: 1, m: 3 }

export function formatLength(value: number, unit: DrawingUnit): string {
  return `${Number(value.toFixed(UNIT_DECIMALS[unit])).toLocaleString("sv-SE")} ${unit}`
}

export type Bounds = { x: number; y: number; width: number; height: number }

/** Bounding box of everything drawn, including dimension lines and text; null when empty. */
export function elementsBounds(elements: DrawingElement[], textSize: number): Bounds | null {
  const pts: Pt[] = []
  for (const el of elements) {
    switch (el.type) {
      case "ellipse":
        pts.push({ x: el.cx - el.rx, y: el.cy - el.ry }, { x: el.cx + el.rx, y: el.cy + el.ry })
        break
      case "dimension": {
        const g = dimensionGeometry(el)
        pts.push(...elementAnchors(el), g.a, g.b, g.ext1.to, g.ext2.to)
        break
      }
      case "text": {
        const size = el.size ?? textSize
        pts.push({ x: el.x, y: el.y - size }, { x: el.x + el.text.length * size * 0.6, y: el.y + size * 0.3 })
        break
      }
      case "note": {
        const lines = el.text.split("\n")
        pts.push(
          { x: el.x, y: el.y },
          {
            x: el.x + Math.max(4, ...lines.map((l) => l.length)) * textSize * 0.6 + textSize,
            y: el.y + lines.length * textSize * 1.3 + textSize * 0.6,
          }
        )
        break
      }
      default:
        pts.push(...elementAnchors(el))
    }
  }
  if (!pts.length) return null
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/** Standard drawing scales (1:N). */
const SCALES = [1, 2, 5, 10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000, 2000, 5000]

/** Smallest standard scale at which `widthMm` x `heightMm` of real size fits in the given paper area. */
export function fitScale(widthMm: number, heightMm: number, availW: number, availH: number): number {
  return SCALES.find((n) => widthMm / n <= availW && heightMm / n <= availH) ?? SCALES[SCALES.length - 1]
}

export const MM_PER_UNIT: Record<DrawingUnit, number> = { mm: 1, cm: 10, m: 1000 }

const UNIT_TO_M: Record<DrawingUnit, number> = { mm: 0.001, cm: 0.01, m: 1 }

/** Shoelace formula. */
const polygonArea = (points: [number, number][]) => {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

/** Live estimate of what the API computes: surfaces and openings (elements with a role), in m2. */
export function computeArea(elements: DrawingElement[], unit: DrawingUnit): DrawingArea {
  const toM2 = UNIT_TO_M[unit] ** 2
  let surface = 0
  let openings = 0
  for (const el of elements) {
    if ((el.type !== "rect" && el.type !== "polygon") || !el.role) continue
    const area = (el.type === "rect" ? Math.abs(el.width * el.height) : polygonArea(el.points)) * toM2
    if (el.role === "surface") surface += area
    else openings += area
  }
  return { surface_m2: surface, openings_m2: openings, net_m2: surface - openings }
}

export const edgeLength = (points: Pt[], i: number) => distance(points[i], points[i + 1])

/** Sets the length of edge i -> i+1 and shifts all later points so their edges keep length and angle. */
export function setEdgeLength(points: Pt[], i: number, length: number): Pt[] {
  const a = points[i]
  const b = points[i + 1]
  const current = distance(a, b)
  const ux = current === 0 ? 1 : (b.x - a.x) / current
  const uy = current === 0 ? 0 : (b.y - a.y) / current
  const dx = a.x + ux * length - b.x
  const dy = a.y + uy * length - b.y
  return points.map((p, j) => (j > i ? { x: p.x + dx, y: p.y + dy } : p))
}

export const formatArea =(m2: number | undefined) =>
  `${Number((m2 ?? 0).toFixed(2)).toLocaleString("sv-SE")} m²`

/** Geometry of a dimension: measured points, offset line, extension lines and label placement. */
export function dimensionGeometry(el: Extract<DrawingElement, { type: "dimension" }>) {
  const dx = el.x2 - el.x1
  const dy = el.y2 - el.y1
  const length = Math.hypot(dx, dy)
  const ux = length === 0 ? 1 : dx / length
  const uy = length === 0 ? 0 : dy / length
  // Left-hand normal in screen space (y down).
  const nx = uy
  const ny = -ux
  const a: Pt = { x: el.x1 + nx * el.offset, y: el.y1 + ny * el.offset }
  const b: Pt = { x: el.x2 + nx * el.offset, y: el.y2 + ny * el.offset }
  const overshoot = Math.sign(el.offset || 1) * Math.min(Math.abs(el.offset) * 0.2, length * 0.05 + 1)
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI
  if (angle > 90 || angle <= -90) angle += 180
  return {
    length,
    a,
    b,
    unit: { x: ux, y: uy },
    // Extension lines run from the measured point slightly past the dimension line.
    ext1: { from: { x: el.x1, y: el.y1 }, to: { x: a.x + nx * overshoot, y: a.y + ny * overshoot } },
    ext2: { from: { x: el.x2, y: el.y2 }, to: { x: b.x + nx * overshoot, y: b.y + ny * overshoot } },
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    angle,
  }
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
