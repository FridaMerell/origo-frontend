"use client"

import { Checkbox } from "@/app/tempus/forms/Fields"

export type AtlasLayers = { wetland: boolean }

export function LayerPanel({ layers, onChange }: { layers: AtlasLayers; onChange: (layers: AtlasLayers) => void }) {
  return <fieldset className="absolute right-4 top-4 z-20 border border-[#4a3526]/70 bg-[#fbf8f0]/95 px-3 py-2 shadow-sm">
    <legend className="px-1 font-display text-xs italic text-[#4a3526]">Kartlager</legend>
    <div className="grid gap-1 text-xs text-[#4a3526]">
      <Checkbox checked={layers.wetland} onChange={(event) => onChange({ ...layers, wetland: event.target.checked })}>Sankmark</Checkbox>
    </div>
  </fieldset>
}
