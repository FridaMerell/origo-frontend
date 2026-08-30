"use client"

import { useState } from "react"
import QuickObservation from "@/app/tempus/observationer/quick-observation"

export type RegisterRow = {
  id: string
  sequence: number
  species: string
  notes: string
  commonName: string
  scientificName: string | null
  taxonId: string | number | null
}

export default function ChecklistRegister({ rows }: { rows: RegisterRow[] }) {
  const [preset, setPreset] = useState<{ id: string; label: string; scientific: string } | null>(
    null,
  )

  return (
    <>
      <ol className="register-list border-l border-border">
        {rows.map((row) => (
          <li
            key={row.id}
            className="register-row grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] border-b border-border font-display transition-colors hover:bg-surface-2/35 sm:grid-cols-[2.75rem_minmax(12rem,1.75fr)_7rem_3.5rem_minmax(8rem,1fr)]"
          >
            <span className="flex items-start justify-end border-r border-border px-2 py-2 text-[10px] italic tabular-nums text-text-faint">
              {row.sequence}
            </span>
            <span className="register-name min-w-0 border-r border-border px-3 py-1.5">
              <span className="block truncate text-sm italic tracking-wide">{row.commonName}</span>
              {row.scientificName ? (
                <span className="block truncate text-[10px] italic text-text-muted">
                  {row.scientificName}
                </span>
              ) : null}
            </span>
            <span className="register-taxon hidden items-start justify-center border-r border-border px-2 py-2 text-[9px] italic tabular-nums text-text-muted sm:flex">
              {row.taxonId ?? "—"}
            </span>
            <label className="register-check flex cursor-pointer items-center justify-center border-r border-border">
              <input
                type="checkbox"
                aria-label={`Bocka av ${row.commonName}`}
                className="h-4 w-4 accent-current"
                onChange={(event) => {
                  if (event.target.checked && row.species) {
                    setPreset({
                      id: row.species,
                      label: row.commonName,
                      scientific: row.scientificName ?? "",
                    })
                  }
                }}
              />
            </label>
            <span className="register-notes hidden border-r border-border px-3 py-1.5 text-[10px] italic leading-4 text-text-muted sm:block">
              {row.notes || ""}
            </span>
          </li>
        ))}
      </ol>

      <QuickObservation hideTrigger species={preset} onConsumed={() => setPreset(null)} />
    </>
  )
}
