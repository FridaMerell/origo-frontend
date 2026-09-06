"use client"

import { useEffect, useRef, useState } from "react"
import { speciesName } from "@/app/tempus/_state/tempus-context"
import type { TempusSpecies } from "@/app/lib/dal"
import { X } from "lucide-react"

export type ObservationRow = {
  key: string
  speciesId: string
  count: string
  lifeStage: string
  notes: string
}

export function ObservationRowList({
  rows,
  selectedSpecies,
  rowErrors,
  onUpdateRow,
  onRemoveRow,
}: {
  rows: ObservationRow[]
  selectedSpecies: Map<string, TempusSpecies>
  rowErrors: Record<string, string>
  onUpdateRow: (key: string, patch: Partial<ObservationRow>) => void
  onRemoveRow: (key: string) => void
}) {
  const [customLifeStageRows, setCustomLifeStageRows] = useState<Set<string>>(() => new Set())
  const customLifeStageInputs = useRef(new Map<string, HTMLInputElement>())

  const focusCustomLifeStage = (key: string) => {
    requestAnimationFrame(() => customLifeStageInputs.current.get(key)?.focus())
  }

  useEffect(() => {
    if (rows.length !== 1) return
    const row = rows[0]
    const stages = [...new Set((selectedSpecies.get(row.speciesId)?.stages ?? []).map((stage) => stage.trim()).filter(Boolean))]
    if (stages.length === 0) return
    const onStageShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable='true']")) return
      const shortcutIndex = event.key === "0" ? stages.length : Number(event.key) - 1
      if (!Number.isInteger(shortcutIndex) || shortcutIndex < 0 || shortcutIndex > stages.length) return
      event.preventDefault()
      if (shortcutIndex === stages.length) {
        setCustomLifeStageRows((current) => new Set(current).add(row.key))
        if (stages.includes(row.lifeStage)) onUpdateRow(row.key, { lifeStage: "" })
        requestAnimationFrame(() => customLifeStageInputs.current.get(row.key)?.focus())
        return
      }
      setCustomLifeStageRows((current) => {
        const next = new Set(current)
        next.delete(row.key)
        return next
      })
      onUpdateRow(row.key, { lifeStage: stages[shortcutIndex] })
    }
    window.addEventListener("keydown", onStageShortcut)
    return () => window.removeEventListener("keydown", onStageShortcut)
  }, [onUpdateRow, rows, selectedSpecies])

  return (
    <section className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="hidden grid-cols-[2.25rem_minmax(12rem,1.5fr)_6rem_minmax(12rem,1fr)_minmax(10rem,1fr)_2.5rem] border-l border-t border-border font-display text-[9px] italic text-text-muted sm:grid">
        <span className="border-b border-r border-border px-2 py-1.5 text-center">Nr</span>
        <span className="border-b border-r border-border px-3 py-1.5">Artens namn</span>
        <span className="border-b border-r border-border px-2 py-1.5 text-center">Antal</span>
        <span className="border-b border-r border-border px-3 py-1.5">Livsstadie</span>
        <span className="border-b border-r border-border px-3 py-1.5">Anteckning</span>
        <span className="border-b border-r border-border" />
      </div>

      {rows.length > 0 ? (
        <ol className="border-l border-t border-border sm:border-t-0">
          {rows.map((row, index) => {
            const match = selectedSpecies.get(row.speciesId)
            const stages = [...new Set((match?.stages ?? []).map((stage) => stage.trim()).filter(Boolean))]
            const usesCustomLifeStage = customLifeStageRows.has(row.key) || Boolean(row.lifeStage && !stages.includes(row.lifeStage))
            return (
              <li key={row.key} className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] border-b border-border font-display sm:grid-cols-[2.25rem_minmax(12rem,1.5fr)_6rem_minmax(12rem,1fr)_minmax(10rem,1fr)_2.5rem]">
                <span className="row-span-4 flex justify-end border-r border-border px-2 py-2 text-[10px] italic text-text-faint sm:row-span-1">
                  {index + 1}
                </span>
                <span className="min-w-0 border-r border-border px-3 py-1.5">
                  <span className="block truncate text-sm italic">{match ? speciesName(match) : "Okänd art"}</span>
                  {match ? <span className="block truncate text-[10px] italic text-text-muted">{match.scientific_name}</span> : null}
                </span>
                <input
                  inputMode="numeric"
                  value={row.count}
                  onChange={(event) => onUpdateRow(row.key, { count: event.target.value })}
                  placeholder="Antal"
                  aria-label={`Antal för ${match ? speciesName(match) : "art"}`}
                  className="col-start-2 row-start-2 h-8 min-w-0 border-r border-t border-border bg-transparent px-3 text-xs text-text placeholder:text-text-faint focus:bg-surface-2 focus:outline-none sm:col-start-3 sm:row-start-1 sm:h-auto sm:border-t-0 sm:text-center"
                />
                {stages.length > 0 ? (
                  <div className="col-start-2 row-start-3 border-r border-t border-border px-3 py-2 sm:col-start-4 sm:row-start-1 sm:border-t-0">
                    <div
                      className="flex flex-wrap gap-1"
                      role="group"
                      aria-label={`Livsstadie för ${match ? speciesName(match) : "art"}`}
                      onKeyDown={(event) => {
                        const shortcutIndex = event.key === "0" ? stages.length : Number(event.key) - 1
                        if (!Number.isInteger(shortcutIndex) || shortcutIndex < 0 || shortcutIndex > stages.length) return
                        event.preventDefault()
                        if (shortcutIndex === stages.length) {
                          setCustomLifeStageRows((current) => new Set(current).add(row.key))
                          if (stages.includes(row.lifeStage)) onUpdateRow(row.key, { lifeStage: "" })
                          focusCustomLifeStage(row.key)
                          return
                        }
                        setCustomLifeStageRows((current) => {
                          const next = new Set(current)
                          next.delete(row.key)
                          return next
                        })
                        onUpdateRow(row.key, { lifeStage: stages[shortcutIndex] })
                      }}
                    >
                      {stages.map((stage, index) => (
                        <button
                          key={stage}
                          type="button"
                          aria-keyshortcuts={String(stages.indexOf(stage) + 1)}
                          onClick={() => {
                            setCustomLifeStageRows((current) => {
                              const next = new Set(current)
                              next.delete(row.key)
                              return next
                            })
                            onUpdateRow(row.key, { lifeStage: stage })
                          }}
                          className={`rounded border px-2 py-1 text-[10px] italic ${row.lifeStage === stage && !usesCustomLifeStage ? "border-accent bg-accent-wash text-accent" : "border-field-border text-text-muted hover:border-border-strong"}`}
                        >
                          {index + 1}. {stage}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-keyshortcuts="0"
                        onClick={() => {
                          setCustomLifeStageRows((current) => new Set(current).add(row.key))
                          if (stages.includes(row.lifeStage)) onUpdateRow(row.key, { lifeStage: "" })
                          focusCustomLifeStage(row.key)
                        }}
                        className={`rounded border px-2 py-1 text-[10px] italic ${usesCustomLifeStage ? "border-accent bg-accent-wash text-accent" : "border-field-border text-text-muted hover:border-border-strong"}`}
                      >
                        0. Annat
                      </button>
                    </div>
                    {usesCustomLifeStage ? (
                      <input
                        value={row.lifeStage}
                        ref={(input) => {
                          if (input) customLifeStageInputs.current.set(row.key, input)
                          else customLifeStageInputs.current.delete(row.key)
                        }}
                        onChange={(event) => onUpdateRow(row.key, { lifeStage: event.target.value })}
                        placeholder="Ange livsstadie"
                        aria-label={`Annat livsstadie för ${match ? speciesName(match) : "art"}`}
                        className="mt-2 h-8 w-full rounded border border-field-border bg-surface px-2.5 text-xs text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                      />
                    ) : null}
                  </div>
                ) : (
                  <span className="col-start-2 row-start-3 border-r border-t border-border px-3 py-2 text-[10px] italic text-text-faint sm:col-start-4 sm:row-start-1 sm:border-t-0">—</span>
                )}
                <input
                  value={row.notes}
                  onChange={(event) => onUpdateRow(row.key, { notes: event.target.value })}
                  placeholder="Anteckning (valfritt)"
                  aria-label={`Anteckning för ${match ? speciesName(match) : "art"}`}
                  className="col-start-2 row-start-4 h-8 min-w-0 border-r border-t border-border bg-transparent px-3 text-xs italic text-text placeholder:text-text-faint focus:bg-surface-2 focus:outline-none sm:col-start-5 sm:row-start-1 sm:h-auto sm:border-t-0"
                />
                <button
                  type="button"
                  onClick={() => onRemoveRow(row.key)}
                  aria-label="Ta bort art"
                  className="col-start-3 row-span-4 row-start-1 flex items-center justify-center border-r border-border text-text-faint hover:bg-danger-wash hover:text-danger sm:col-start-6 sm:row-span-1"
                >
                  <X size={14} />
                </button>
                {rowErrors[row.key] ? (
                  <p className="col-start-2 col-end-4 border-r border-t border-border px-3 py-1 text-[10px] text-danger sm:col-start-2 sm:col-end-7">
                    {rowErrors[row.key]}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="border-l border-t border-border" aria-label="Inga arter tillagda än">
          {[1, 2, 3].map((line) => (
            <div key={line} className="grid h-10 grid-cols-[2.25rem_minmax(0,1fr)_6rem_minmax(12rem,1fr)_minmax(10rem,1fr)_2.5rem] border-b border-border">
              <span className="border-r border-border" />
              <span className="border-r border-border" />
              <span className="border-r border-border" />
              <span className="border-r border-border" />
              <span className="border-r border-border" />
              <span className="border-r border-border" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
