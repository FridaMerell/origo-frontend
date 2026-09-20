import type { CSSProperties } from "react"
import type { Drawing, DrawingPage } from "@/app/lib/dal"
import { ElementView } from "@/app/verso/ritningar/editor/element-view"
import {
  MM_PER_UNIT,
  computeArea,
  elementsBounds,
  fitScale,
  formatArea,
  formatLength,
  niceStep,
} from "@/app/verso/ritningar/editor/geometry"

export const PAPERS: Record<"A4" | "A3", { width: number; height: number }> = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 },
}

export type PerSheet = 1 | 2 | 4 | 6

const MARGIN = 10
const PAD = 6
const HEADER = 14
const BOTTOM_BAND = 42
const TEXT_MM = 2.5

// Print is always black on white; roles are told apart by gray tone.
const SHEET_VARS = {
  "--accent": "#000",
  "--accent-wash": "#e4e4e4",
  "--border": "#a8a8a8",
  "--surface": "#fff",
} as CSSProperties

function gridFor(count: number, landscape: boolean): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 }
  if (count === 2) return landscape ? { cols: 2, rows: 1 } : { cols: 1, rows: 2 }
  if (count <= 4) return { cols: 2, rows: 2 }
  return landscape ? { cols: 3, rows: 2 } : { cols: 2, rows: 3 }
}

function Cell({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div style={{ border: "0.25mm solid #000", padding: "0.8mm 1.5mm", gridColumn: span ? "1 / -1" : undefined }}>
      <div style={{ fontSize: "1.8mm", textTransform: "uppercase", color: "#555", letterSpacing: "0.1mm" }}>{label}</div>
      <div style={{ fontSize: "3.2mm", minHeight: "3.6mm", lineHeight: 1.15 }}>{value}</div>
    </div>
  )
}

/**
 * One printed sheet with one or more views (drawing pages). All views on a sheet share one
 * real scale (1:N), and each gets a number, title and area caption, like a building drawing set.
 */
export function DrawingSheet({
  drawing,
  pages,
  firstNumber,
  sheetIndex,
  sheetTotal,
  houseName,
  paper,
  landscape,
  perSheet,
  date,
}: {
  drawing: Drawing
  pages: DrawingPage[]
  firstNumber: number
  sheetIndex: number
  sheetTotal: number
  houseName: string
  paper: keyof typeof PAPERS
  landscape: boolean
  perSheet: PerSheet
  date: string
}) {
  const sheetW = landscape ? PAPERS[paper].width : PAPERS[paper].height
  const sheetH = landscape ? PAPERS[paper].height : PAPERS[paper].width
  const mmPerUnit = MM_PER_UNIT[drawing.unit]

  const areaX = MARGIN + PAD
  const areaY = MARGIN + PAD
  const areaW = sheetW - 2 * (MARGIN + PAD)
  const areaH = sheetH - 2 * MARGIN - PAD - BOTTOM_BAND
  const { cols, rows } = gridFor(perSheet, landscape)
  const cellW = areaW / cols
  const cellH = areaH / rows
  const drawAvailW = cellW - PAD
  const drawAvailH = cellH - HEADER - PAD

  // Fit each view to its drawn content, not the whole canvas, so the drawing uses the space well.
  const views = pages.map((page) => {
    const bounds = elementsBounds(page.elements, page.height / 40) ?? { x: 0, y: 0, width: page.width, height: page.height }
    const pad = Math.max(bounds.width, bounds.height) * 0.04
    return {
      page,
      view: { x: bounds.x - pad, y: bounds.y - pad, width: bounds.width + 2 * pad, height: bounds.height + 2 * pad },
    }
  })

  // One scale for the whole sheet: the largest view decides, so sizes stay comparable.
  const scale = Math.max(
    ...views.map(({ view }) => fitScale(view.width * mmPerUnit, view.height * mmPerUnit, drawAvailW, drawAvailH))
  )
  const textSize = (TEXT_MM * scale) / mmPerUnit

  const widest = Math.max(...views.map(({ view }) => view.width))
  const barWorld = niceStep(widest / 8)
  const barMm = (barWorld * mmPerUnit) / scale

  return (
    <section
      style={{
        ...SHEET_VARS,
        position: "relative",
        width: `${sheetW}mm`,
        height: `${sheetH}mm`,
        background: "#fff",
        color: "#000",
        overflow: "hidden",
        breakAfter: "page",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div style={{ position: "absolute", inset: `${MARGIN}mm`, border: "0.7mm solid #000" }} />

      {views.map(({ page, view }, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const left = areaX + col * cellW
        const top = areaY + row * cellH
        const drawW = (view.width * mmPerUnit) / scale
        const drawH = (view.height * mmPerUnit) / scale
        const area = computeArea(page.elements, drawing.unit)

        return (
          <div key={page.id} style={{ position: "absolute", left: `${left}mm`, top: `${top}mm`, width: `${cellW}mm`, height: `${cellH}mm` }}>
            <div style={{ position: "absolute", left: "1mm", top: "1mm", display: "flex", alignItems: "center", gap: "3mm" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "8mm",
                  height: "8mm",
                  border: "0.4mm solid #000",
                  borderRadius: "50%",
                  fontSize: "4mm",
                }}
              >
                {firstNumber + i}
              </span>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                <span style={{ fontSize: "4.5mm", textTransform: "uppercase", letterSpacing: "0.2mm" }}>{page.name}</span>
                <span style={{ fontSize: "3mm", color: "#333" }}>
                  1 : {scale}
                  {area.surface_m2 > 0 && ` · netto ${formatArea(area.net_m2)}`}
                </span>
              </span>
            </div>

            <svg
              viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
              overflow="visible"
              style={{
                position: "absolute",
                left: `${(drawAvailW - drawW) / 2 + PAD / 2}mm`,
                top: `${HEADER + (drawAvailH - drawH) / 2}mm`,
                width: `${drawW}mm`,
                height: `${drawH}mm`,
              }}
            >
              {page.elements.map((el) => (
                <ElementView key={el.id} el={el} selected={false} unit={drawing.unit} textSize={textSize} />
              ))}
            </svg>
          </div>
        )
      })}

      <svg
        viewBox={`0 -4 ${barMm + 20} 10`}
        style={{
          position: "absolute",
          left: `${MARGIN + PAD}mm`,
          bottom: `${MARGIN + 6}mm`,
          width: `${barMm + 20}mm`,
          height: "10mm",
          fontSize: "2.5px",
        }}
      >
        <rect x={0} y={0} width={barMm / 2} height={1.5} fill="#000" stroke="#000" strokeWidth={0.25} />
        <rect x={barMm / 2} y={0} width={barMm / 2} height={1.5} fill="#fff" stroke="#000" strokeWidth={0.25} />
        <text x={0} y={5} textAnchor="middle" fill="#000">0</text>
        <text x={barMm} y={5} textAnchor="middle" fill="#000">{formatLength(barWorld, drawing.unit)}</text>
      </svg>

      <div
        style={{
          position: "absolute",
          right: `${MARGIN}mm`,
          bottom: `${MARGIN}mm`,
          width: "140mm",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: "#fff",
        }}
      >
        <Cell label="Fastighet" value={houseName} />
        <Cell label="Ritning" value={drawing.name} />
        <Cell label="Vyer" value={pages.map((p, i) => `${firstNumber + i} ${p.name}`).join(", ")} />
        <Cell label="Skala" value={`1 : ${scale}`} />
        <Cell label="Datum" value={date} />
        <Cell label="Blad" value={`${sheetIndex} av ${sheetTotal}`} />
        <Cell span label="Ritad av" value="" />
      </div>
    </section>
  )
}
