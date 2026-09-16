"use client"

import { useRef, useState } from "react"
import type { Map as MaplibreMap } from "maplibre-gl"
import type { AtlasPoint } from "./LocaleAtlasMap"
import { useMapFrame } from "./useMapFrame"

type Item = { id: string; text: string; active: boolean }
type Group = { key: string; x: number; y: number; size: number; items: Item[] }

const ITEMS_PER_ROW = 4
const MAX_ROWS = 2
const OBSERVATION_LABEL_COLOR = "#271b13"
const OBSERVATION_LABEL_ACTIVE_COLOR = "#c0392b"
const OBSERVATION_LABEL_HALO = "#fbf8f0"

function sizeForZoom(zoom: number) {
  // Mirrors the old MapLibre symbol layer's interpolation: 14px at zoom 10
  // up to 24px at zoom 16.
  return Math.min(24, Math.max(14, 14 + (zoom - 10) * (10 / 6)))
}

function locationKey(point: AtlasPoint) {
  return `${point.coordinates[0].toFixed(6)},${point.coordinates[1].toFixed(6)}`
}

function chunkItems(items: readonly Item[]): { rows: Item[][]; overflow: number } {
  const rows: Item[][] = []
  for (let index = 0; index < items.length; index += ITEMS_PER_ROW) rows.push(items.slice(index, index + ITEMS_PER_ROW))
  if (rows.length <= MAX_ROWS) return { rows, overflow: 0 }
  return { rows: rows.slice(0, MAX_ROWS), overflow: items.length - MAX_ROWS * ITEMS_PER_ROW }
}

/**
 * Same reasoning as PlaceLabels: MapLibre's text-font can only use glyphs
 * pre-rendered on the `glyphs` server (Noto Sans only, no serif), so the
 * observation markers ("A.3" etc.) drawn via the `locale-observation-points`
 * symbol layer could never show Petrona either. That layer is kept (its
 * paint text-opacity set near-zero elsewhere) purely so click hit-testing
 * still works; the visible text is this plain HTML overlay instead. Unlike
 * PlaceLabels, no MapLibre query is needed here — the points and their
 * labels already come straight from React state (`points` prop), so this
 * just reprojects them to screen space on move/zoom.
 *
 * Observations that share the exact same coordinates (several sightings
 * recorded at one spot) are combined onto lines, comma-separated, up to 4
 * per line and 2 lines — rather than stacking illegibly on top of each
 * other or running off in one endless row. Each name keeps its own colour
 * so the selected observation still stands out.
 */
export function ObservationLabels({ map, points, selectedPoint }: { map: MaplibreMap; points: readonly AtlasPoint[]; selectedPoint: AtlasPoint | null }) {
  const [groups, setGroups] = useState<Group[]>([])
  const lastKey = useRef("")

  useMapFrame(map, ["move", "zoom"], () => {
    const size = sizeForZoom(map.getZoom())
    const byLocation = new Map<string, { x: number; y: number; items: Item[] }>()
    points.forEach((point, index) => {
      if (!point.label) return
      const key = locationKey(point)
      let entry = byLocation.get(key)
      if (!entry) {
        const projected = map.project([point.coordinates[0], point.coordinates[1]])
        entry = { x: projected.x, y: projected.y, items: [] }
        byLocation.set(key, entry)
      }
      entry.items.push({
        id: String(point.id ?? index),
        text: point.label,
        active: selectedPoint !== null && String(selectedPoint.id ?? "") === String(point.id ?? index),
      })
    })
    const next: Group[] = [...byLocation.entries()].map(([key, entry]) => ({ key, x: entry.x, y: entry.y, size, items: entry.items }))
    const renderKey = next.map((group) => `${group.key}:${Math.round(group.x)}:${Math.round(group.y)}:${group.items.map((item) => `${item.text}${item.active ? "*" : ""}`).join(",")}`).join("|")
    if (renderKey === lastKey.current) return
    lastKey.current = renderKey
    setGroups(next)
  })

  return <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
    {groups.map((group) => {
      const { rows, overflow } = chunkItems(group.items)
      const lineHeight = group.size * 1.25
      const topOffset = -((rows.length - 1) * lineHeight) / 2
      return rows.map((row, rowIndex) => (
        <span
          key={`${group.key}:${rowIndex}`}
          className="font-display absolute italic font-bold"
          style={{
            left: group.x,
            top: group.y + topOffset + rowIndex * lineHeight,
            transform: "translate(-50%, -50%)",
            fontSize: group.size,
            textShadow: `0 0 2px ${OBSERVATION_LABEL_HALO}, 0 0 2px ${OBSERVATION_LABEL_HALO}, 0 0 3px ${OBSERVATION_LABEL_HALO}`,
            whiteSpace: "nowrap",
          }}
        >
          {row.map((item, index) => (
            <span key={item.id}>
              {index > 0 ? <span style={{ color: OBSERVATION_LABEL_COLOR }}>{", "}</span> : null}
              <span style={{ color: item.active ? OBSERVATION_LABEL_ACTIVE_COLOR : OBSERVATION_LABEL_COLOR }}>{item.text}</span>
            </span>
          ))}
          {rowIndex === rows.length - 1 && overflow > 0 ? <span style={{ color: OBSERVATION_LABEL_COLOR }}>{` +${overflow}`}</span> : null}
        </span>
      ))
    })}
  </div>
}
