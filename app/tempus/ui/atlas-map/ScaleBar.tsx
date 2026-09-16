"use client"

import { useState } from "react"
import { scaleForPixels } from "@/app/lib/units"

export function ScaleBar({ metersPerPixel }: { metersPerPixel: number }) {
  const [historic, setHistoric] = useState(true)
  const scale = scaleForPixels(metersPerPixel, historic)
  return <button type="button" onClick={() => setHistoric((value) => !value)} className="absolute bottom-5 right-5 z-20 rounded border border-[#4a3526]/70 bg-[#fbf8f0]/90 px-3 py-2 text-left font-display text-xs italic text-[#4a3526] shadow-sm" aria-label={`Skala ${scale.label}. Klicka för ${historic ? "meter och kilometer" : "gamla svenska mått"}.`}>
    <span className="mb-1 block h-2 border-x border-t border-[#4a3526]" style={{ width: Math.max(40, Math.min(150, scale.pixels)) }} />
    {scale.label}
  </button>
}
