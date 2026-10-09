"use client"

import { useEffect, useState } from "react"
import type { Map } from "maplibre-gl"

const buttonClass = "grid size-11 place-items-center border border-[#4a3526]/55 bg-[#fbf8f0]/95 font-display text-2xl leading-none text-[#4a3526] hover:bg-[#efe7d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a4c38] disabled:cursor-not-allowed disabled:text-[#4a3526]/35 disabled:hover:bg-[#fbf8f0]/95"

// Zoom only — no pan. The locale atlas is a fixed view of one property
// (fitBounds on load; dragPan/scrollZoom/etc. are off on the map itself), not
// a navigable map you can move away from. Zooming in/out to see detail while
// staying centred on the locale is still useful; panning elsewhere isn't.
// Each button switches off at its limit: the map's minZoom is set from the
// fitted view (LocaleAtlasMap), so "−" stops a little outside the locale.
export function ZoomControl({ map }: { map: Map }) {
  const [limits, setLimits] = useState({ atMin: false, atMax: false })

  useEffect(() => {
    const update = () => {
      const zoom = map.getZoom()
      const atMin = zoom <= map.getMinZoom() + 0.01
      const atMax = zoom >= map.getMaxZoom() - 0.01
      setLimits((current) => (current.atMin === atMin && current.atMax === atMax ? current : { atMin, atMax }))
    }
    update()
    map.on("zoomend", update)
    map.on("moveend", update)
    return () => {
      map.off("zoomend", update)
      map.off("moveend", update)
    }
  }, [map])

  return <nav className="absolute bottom-5 left-5 z-20 flex flex-col gap-px rounded border border-[#4a3526]/70 bg-[#4a3526]/70 p-px shadow-sm" aria-label="Zooma kartan">
    <button type="button" className={buttonClass} onClick={() => map.zoomIn({ duration: 220 })} disabled={limits.atMax} aria-label="Zooma in">+</button>
    <button type="button" className={buttonClass} onClick={() => map.zoomOut({ duration: 220 })} disabled={limits.atMin} aria-label="Zooma ut">−</button>
  </nav>
}
