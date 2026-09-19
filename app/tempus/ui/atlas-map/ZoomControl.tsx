"use client"

import type { Map } from "maplibre-gl"

const buttonClass = "grid size-8 place-items-center border border-[#4a3526]/55 bg-[#fbf8f0]/95 font-display text-base text-[#4a3526] hover:bg-[#efe7d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a4c38]"

// Zoom only — no pan. The locale atlas is a fixed view of one property
// (fitBounds on load; dragPan/scrollZoom/etc. are off on the map itself), not
// a navigable map you can move away from. Zooming in/out to see detail while
// staying centred on the locale is still useful; panning elsewhere isn't.
export function ZoomControl({ map }: { map: Map }) {
  return <nav className="absolute bottom-5 left-5 z-20 flex flex-col gap-px rounded border border-[#4a3526]/70 bg-[#4a3526]/70 p-px shadow-sm" aria-label="Zooma kartan">
    <button type="button" className={buttonClass} onClick={() => map.zoomIn({ duration: 220 })} aria-label="Zooma in">+</button>
    <button type="button" className={buttonClass} onClick={() => map.zoomOut({ duration: 220 })} aria-label="Zooma ut">−</button>
  </nav>
}
