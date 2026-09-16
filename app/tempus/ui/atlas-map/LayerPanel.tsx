"use client"

import { Checkbox } from "@/app/tempus/forms/Fields"

export type AtlasLayers = { roads: boolean; buildings: boolean; wetland: boolean; landCover: boolean }

export function LayerPanel({ layers, onChange }: { layers: AtlasLayers; onChange: (layers: AtlasLayers) => void }) {
  return <fieldset className="absolute right-4 top-4 z-20 border border-[#4a3526]/70 bg-[#fbf8f0]/95 px-3 py-2 shadow-sm">
    <legend className="px-1 font-display text-xs italic text-[#4a3526]">Kartlager</legend>
    <div className="grid gap-1 text-xs text-[#4a3526]">
      <Checkbox checked={layers.roads} onChange={(event) => onChange({ ...layers, roads: event.target.checked })}>Vägar</Checkbox>
      <Checkbox checked={layers.buildings} onChange={(event) => onChange({ ...layers, buildings: event.target.checked })}>Hus</Checkbox>
      {/* Marktäcke, vyn already shows wetland as its own classification when
          it's the active ground truth, so the separate highlight becomes a
          redundant, confusing second control — disable it instead of letting
          the two fight over the same visual. */}
      <Checkbox checked={layers.wetland || layers.landCover} disabled={layers.landCover} className={layers.landCover ? "opacity-50" : ""} onChange={(event) => onChange({ ...layers, wetland: event.target.checked })}>Sankmark</Checkbox>
      <Checkbox checked={layers.landCover} onChange={(event) => onChange({ ...layers, landCover: event.target.checked })}>Marktäcke, vyn</Checkbox>
    </div>
  </fieldset>
}
