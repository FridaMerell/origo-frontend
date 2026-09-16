"use client"

import type { Map } from "maplibre-gl"

const buttonClass = "grid size-8 place-items-center border border-[#4a3526]/55 bg-[#fbf8f0]/95 font-display text-base text-[#4a3526] hover:bg-[#efe7d5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a4c38]"

export function MapStepNavigation({ map }: { map: Map }) {
  const step = (x: number, y: number) => {
    const { clientWidth, clientHeight } = map.getContainer()
    map.panBy([x * clientWidth * 0.36, y * clientHeight * 0.36], { duration: 220 })
  }

  return <nav className="absolute bottom-5 left-24 z-20 grid grid-cols-3 gap-px rounded border border-[#4a3526]/70 bg-[#4a3526]/70 p-px shadow-sm" aria-label="Navigera kartan stegvis">
    <span aria-hidden="true" />
    <button type="button" className={buttonClass} onClick={() => step(0, -1)} aria-label="Flytta kartan norrut">↑</button>
    <button type="button" className={buttonClass} onClick={() => map.zoomIn({ duration: 220 })} aria-label="Zooma in">+</button>
    <button type="button" className={buttonClass} onClick={() => step(-1, 0)} aria-label="Flytta kartan västerut">←</button>
    <button type="button" className={buttonClass} onClick={() => step(0, 1)} aria-label="Flytta kartan söderut">↓</button>
    <button type="button" className={buttonClass} onClick={() => step(1, 0)} aria-label="Flytta kartan österut">→</button>
    <span aria-hidden="true" />
    <span aria-hidden="true" />
    <button type="button" className={buttonClass} onClick={() => map.zoomOut({ duration: 220 })} aria-label="Zooma ut">−</button>
  </nav>
}
