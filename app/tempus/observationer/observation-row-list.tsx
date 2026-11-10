"use client"

import { useEffect, useRef, useState } from "react"
import { speciesName } from "@/app/tempus/_state/tempus-context"
import type { TempusSpecies } from "@/app/lib/dal"
import { X } from "lucide-react"
import { ObservationPhotoPicker, toDateTimeLocal, type PhotoMetadata } from "./observation-photos"

export type ObservationRow = {
  key: string
  speciesId: string
  observedAt: string
  count: string
  lifeStage: string
  notes: string
  photos: File[]
}

/** "1030", "930", "10:30" eller "10" → "10:30", "09:30", "10:30", "10:00"; annars null. */
function parseTime(text: string) {
  const trimmed = text.trim()
  const [hours, minutes = "0"] = trimmed.includes(":")
    ? trimmed.split(":")
    : trimmed.length > 2 ? [trimmed.slice(0, -2), trimmed.slice(-2)] : [trimmed]
  if (!/^\d{1,2}$/.test(hours) || !/^\d{1,2}$/.test(minutes)) return null
  const h = Number(hours)
  const m = Number(minutes)
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Klockslag som skrivs in; sparas när fältet lämnas eller med Enter, Escape ångrar. */
function TimeInput({ value, onCommit, label }: { value: string; onCommit: (time: string) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const invalid = draft !== null && parseTime(draft) === null

  const commit = () => {
    if (draft === null) return
    const time = parseTime(draft)
    // Ett ogiltigt klockslag blir tomt, så att formuläret säger till på raden i stället för att spara den gamla tiden.
    onCommit(time ?? "")
    if (time) setDraft(null)
  }

  return (
    <input
      inputMode="numeric"
      value={draft ?? value}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          commit()
        } else if (event.key === "Escape") {
          setDraft(null)
        }
      }}
      placeholder="tt:mm"
      aria-label={label}
      aria-invalid={invalid || undefined}
      title={invalid ? "Skriv klockslaget som 10:30 eller 1030." : undefined}
      className={`h-8 min-w-0 flex-1 self-stretch bg-transparent pr-3 text-xs placeholder:text-text-faint focus:bg-surface-2 focus:outline-none sm:h-auto sm:px-2 sm:text-center ${invalid ? "text-danger" : "text-text"}`}
    />
  )
}

export function ObservationRowList({
  rows,
  selectedSpecies,
  rowErrors,
  onUpdateRow,
  onRemoveRow,
  onPhotoMetadata,
  onPhotoError,
}: {
  rows: ObservationRow[]
  selectedSpecies: Map<string, TempusSpecies>
  rowErrors: Record<string, string>
  onUpdateRow: (key: string, patch: Partial<ObservationRow>) => void
  onRemoveRow: (key: string) => void
  onPhotoMetadata: (key: string, metadata: PhotoMetadata) => void
  onPhotoError: (message: string) => void
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
      <div className="hidden grid-cols-[2.25rem_minmax(0,1fr)_4rem_3.5rem_19rem_2.5rem] border-l border-t border-border font-display text-[9px] italic text-text-muted sm:grid">
        <span className="border-b border-r border-border px-2 py-1.5 text-center">Nr</span>
        <span className="border-b border-r border-border px-3 py-1.5">Artens namn</span>
        <span className="border-b border-r border-border px-2 py-1.5 text-center">Tid</span>
        <span className="border-b border-r border-border px-2 py-1.5 text-center">Antal</span>
        <span className="border-b border-r border-border px-3 py-1.5">Livsstadie</span>
        <span className="border-b border-r border-border" />
      </div>

      {rows.length > 0 ? (
        <ol className="border-l border-t border-border sm:border-t-0">
          {rows.map((row, index) => {
            const match = selectedSpecies.get(row.speciesId)
            const stages = [...new Set((match?.stages ?? []).map((stage) => stage.trim()).filter(Boolean))]
            const usesCustomLifeStage = customLifeStageRows.has(row.key) || Boolean(row.lifeStage && !stages.includes(row.lifeStage))
            return (
              <li key={row.key} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] border-b border-border font-display sm:grid-cols-[2.25rem_minmax(0,1fr)_4rem_3.5rem_19rem_2.5rem]">
                <span className="row-span-5 grid grid-rows-subgrid justify-items-center border-r border-border text-[10px] italic text-text-faint sm:row-span-2">
                  <span className="self-center">{index + 1}</span>
                </span>
                <span className="col-span-2 min-w-0 border-r border-border px-3 py-1.5 sm:col-span-1">
                  <span className="block truncate text-sm italic">{match ? speciesName(match) : "Okänd art"}</span>
                  {match ? <span className="block truncate text-[10px] italic text-text-muted">{match.scientific_name}</span> : null}
                </span>
                <label className="col-start-2 row-start-2 flex min-w-0 items-center gap-2 border-r border-t border-border pl-3 sm:col-start-3 sm:row-start-1 sm:border-t-0 sm:pl-0">
                <span className="text-[9px] italic text-text-faint sm:hidden">Tid</span>
                <TimeInput
                  value={row.observedAt.slice(11, 16)}
                  onCommit={(time) => {
                    // Bara klockslaget ändras här; datumet följer med från raden (eller "Sätt på alla").
                    const date = (row.observedAt || toDateTimeLocal(new Date())).slice(0, 11)
                    onUpdateRow(row.key, { observedAt: `${date}${time}` })
                  }}
                  label={`Tid för ${match ? speciesName(match) : "art"}`}
                />
                </label>
                <label className="col-start-3 row-start-2 flex min-w-0 items-center gap-2 border-r border-t border-border pl-3 sm:col-start-4 sm:row-start-1 sm:border-t-0 sm:pl-0">
                <span className="text-[9px] italic text-text-faint sm:hidden">Antal</span>
                <input
                  inputMode="numeric"
                  value={row.count}
                  onChange={(event) => onUpdateRow(row.key, { count: event.target.value })}
                  placeholder="Antal"
                  aria-label={`Antal för ${match ? speciesName(match) : "art"}`}
                  className="h-8 min-w-0 flex-1 self-stretch bg-transparent pr-3 text-xs text-text placeholder:text-text-faint focus:bg-surface-2 focus:outline-none sm:h-auto sm:px-2 sm:text-center"
                />
                </label>
                {stages.length > 0 ? (
                  <div className="col-start-2 col-end-4 row-start-3 flex flex-col justify-center border-r border-t border-border px-3 py-1.5 sm:col-start-5 sm:col-end-auto sm:row-start-1 sm:border-t-0">
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
                          className={`rounded border px-1.5 py-0.5 text-[10px] italic ${row.lifeStage === stage && !usesCustomLifeStage ? "border-accent bg-accent-wash text-accent" : "border-field-border text-text-muted hover:border-border-strong"}`}
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
                        className={`rounded border px-1.5 py-0.5 text-[10px] italic ${usesCustomLifeStage ? "border-accent bg-accent-wash text-accent" : "border-field-border text-text-muted hover:border-border-strong"}`}
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
                  <span className="col-start-2 col-end-4 row-start-3 flex items-center border-r border-t border-border px-3 py-1.5 text-[10px] italic text-text-faint sm:col-start-5 sm:col-end-auto sm:row-start-1 sm:border-t-0">—</span>
                )}
                <input
                  value={row.notes}
                  onChange={(event) => onUpdateRow(row.key, { notes: event.target.value })}
                  placeholder="Anteckning (valfritt)"
                  aria-label={`Anteckning för ${match ? speciesName(match) : "art"}`}
                  className="col-start-2 col-end-4 row-start-4 h-8 min-w-0 border-r border-t border-border bg-transparent px-3 text-xs italic text-text placeholder:text-text-faint focus:bg-surface-2 focus:outline-none sm:col-start-2 sm:col-end-5 sm:row-start-2 sm:h-auto"
                />
                <button
                  type="button"
                  onClick={() => onRemoveRow(row.key)}
                  aria-label="Ta bort art"
                  className="col-start-4 row-span-4 row-start-1 flex items-center justify-center border-r border-border text-text-faint hover:bg-danger-wash hover:text-danger sm:col-start-6 sm:row-span-1"
                >
                  <X size={14} />
                </button>
                <ObservationPhotoPicker
                  files={row.photos}
                  onChange={(photos) => onUpdateRow(row.key, { photos })}
                  onMetadata={(metadata) => onPhotoMetadata(row.key, metadata)}
                  onError={onPhotoError}
                  compact
                  className="col-start-2 col-end-5 row-start-5 border-r border-t border-border px-3 py-1 sm:col-start-5 sm:col-end-7 sm:row-start-2"
                />
                {rowErrors[row.key] ? (
                  <p className="col-start-2 col-end-5 border-r border-t border-border px-3 py-1 text-[10px] text-danger sm:col-start-2 sm:col-end-7">
                    {rowErrors[row.key]}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="border-l border-t border-border sm:border-t-0" aria-label="Inga arter tillagda än">
          {[1, 2, 3].map((line) => (
            <div key={line} className="grid h-10 grid-cols-[2.25rem_minmax(0,1fr)_4rem_3.5rem_19rem_2.5rem] border-b border-border">
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
