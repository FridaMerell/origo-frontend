"use client"

import { useEffect, useRef, useState } from "react"
import type { Map as MaplibreMap } from "maplibre-gl"
import { INVISIBLE_HIT_TESTABLE_OPACITY } from "./style"
import { useMapFrame } from "./useMapFrame"

type Label = { id: string; text: string; x: number; y: number; size: number }

const PLACE_LABEL_COLOR = "#5b4632"
const PLACE_LABEL_HALO = "#fbf8f0"

function textSizeForZoom(zoom: number) {
  // Mirrors the interpolation the old MapLibre symbol layer used: 11px at
  // zoom 5 up to 15px at zoom 12, held there above that.
  return Math.min(15, Math.max(11, 11 + (zoom - 5) * (4 / 7)))
}

/**
 * Draws place-name labels ourselves instead of MapLibre's built-in symbol
 * layer. MapLibre can only render text using pre-rendered SDF glyphs from
 * the style's `glyphs` server, and OpenFreeMap's only bundles Noto Sans —
 * there is no serif option there at all, so the map's chosen display font
 * (Petrona, already loaded for the rest of the page) could never appear on
 * place names that way.
 *
 * Rather than re-deriving label placement ourselves (querySourceFeatures on
 * a hidden layer turned out unreliable — visibility:none is not guaranteed
 * to still parse/place source-layer features), the `atlas-places` layer is
 * kept fully active but painted essentially transparent
 * (INVISIBLE_HIT_TESTABLE_OPACITY, see style.ts), so MapLibre still does its
 * own collision-free placement every frame. We then read back exactly the
 * features it decided
 * to actually show via queryRenderedFeatures — the same trick already used
 * for buildings-fill/origo-texture-* elsewhere in this file — and draw
 * plain HTML text at those same anchors in Petrona.
 */
export function PlaceLabels({ map }: { map: MaplibreMap }) {
  const [labels, setLabels] = useState<Label[]>([])
  const lastKey = useRef("")

  useEffect(() => {
    let disposed = false
    const applyInvisiblePaint = () => {
      if (!disposed && map.getLayer("atlas-places")) map.setPaintProperty("atlas-places", "text-opacity", INVISIBLE_HIT_TESTABLE_OPACITY)
    }
    if (map.isStyleLoaded()) applyInvisiblePaint()
    else map.once("styledata", applyInvisiblePaint)
    return () => {
      disposed = true
      // The map may already have been torn down (e.g. LocaleAtlasMap
      // unmounting on browser back navigation) by the time this runs —
      // map.getLayer then throws internally reading its own removed style,
      // with no public flag to check for that ahead of time.
      try {
        if (map.getLayer("atlas-places")) map.setPaintProperty("atlas-places", "text-opacity", 1)
      } catch {}
    }
  }, [map])

  useMapFrame(map, ["move", "zoom", "idle", "sourcedata"], () => {
    if (!map.getLayer("atlas-places")) return
    const size = textSizeForZoom(map.getZoom())
    const seenNames = new Set<string>()
    const placed: Label[] = []
    for (const feature of map.queryRenderedFeatures(undefined, { layers: ["atlas-places"] })) {
      if (feature.geometry.type !== "Point") continue
      const name = (feature.properties?.["name:sv"] as string | undefined) || (feature.properties?.name as string | undefined)
      if (!name || seenNames.has(name)) continue
      seenNames.add(name)
      const [lng, lat] = feature.geometry.coordinates as [number, number]
      const point = map.project([lng, lat])
      placed.push({ id: `${name}:${lng.toFixed(4)}:${lat.toFixed(4)}`, text: name, x: point.x, y: point.y, size })
    }
    // Skip the state update (and the re-render it causes) when nothing
    // actually moved enough to change the rounded positions — "move" fires
    // continuously during every pan/zoom animation, and without this a
    // no-op re-render would fire on every one of those frames too.
    const key = placed.map((label) => `${label.id}:${Math.round(label.x)}:${Math.round(label.y)}`).join("|")
    if (key === lastKey.current) return
    lastKey.current = key
    setLabels(placed)
  })

  return <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
    {labels.map((label) => (
      <span
        key={label.id}
        className="font-display absolute italic"
        style={{
          left: label.x,
          top: label.y,
          transform: "translate(-50%, -50%)",
          fontSize: label.size,
          color: PLACE_LABEL_COLOR,
          textShadow: `0 0 2px ${PLACE_LABEL_HALO}, 0 0 2px ${PLACE_LABEL_HALO}, 0 0 3px ${PLACE_LABEL_HALO}`,
          whiteSpace: "nowrap",
        }}
      >
        {label.text}
      </span>
    ))}
  </div>
}
