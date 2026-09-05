"use client"

import type { RegisterRow } from "./checklist-register"

export function ChecklistRowList({
  rows,
  searchLoading,
  resultPage,
  resultCount,
  hasPrevious,
  hasNext,
  onSelectRow,
  onCheckRow,
  onChangePage,
}: {
  rows: RegisterRow[]
  searchLoading: boolean
  resultPage: number
  resultCount: number
  hasPrevious: boolean
  hasNext: boolean
  onSelectRow: (row: RegisterRow) => void
  onCheckRow: (row: RegisterRow) => void
  onChangePage: (page: number) => void
}) {
  return (
    <>
      <ol className={`register-list border-l border-border ${searchLoading ? "opacity-50" : ""}`} aria-busy={searchLoading}>
        {rows.map((row) => (
          <li
            key={row.id}
            className="register-row grid min-h-12 grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] border-b border-border font-display transition-colors hover:bg-surface-2/35 sm:grid-cols-[2.75rem_minmax(12rem,1.75fr)_7rem_3.5rem_minmax(8rem,1fr)]"
          >
            <span className="flex items-start justify-end border-r border-border px-2 py-2 text-xs italic tabular-nums text-text-faint">
              {row.sequence}
            </span>
            <button
              type="button"
              onClick={() => {
                if (!row.species) return
                onSelectRow(row)
              }}
              className="register-name min-w-0 border-r border-border px-3 py-1.5 text-left"
            >
              <span className="block truncate text-base italic tracking-wide">{row.commonName}</span>
              {row.scientificName ? (
                <span className="block truncate text-[11px] italic text-text-muted">
                  {row.scientificName}
                </span>
              ) : null}
            </button>
            <span className="register-taxon hidden items-start justify-center border-r border-border px-2 py-2 text-xs italic tabular-nums text-text-muted sm:flex">
              {row.taxonId ?? "—"}
            </span>
            <label className="register-check flex cursor-pointer items-center justify-center border-r border-border">
              <input
                type="checkbox"
                aria-label={`Bocka av ${row.commonName}`}
                aria-disabled={row.isObserved}
                defaultChecked={row.isObserved}
                className="h-4 w-4 accent-accent"
                onClick={(event) => {
                  if (row.isObserved) event.preventDefault()
                }}
                onChange={(event) => {
                  if (!event.target.checked) return
                  onCheckRow(row)
                }}
              />
            </label>
            <span className="register-notes hidden border-r border-border px-3 py-1.5 text-[11px] italic leading-4 text-text-muted sm:block">
              {row.notes || ""}
            </span>
          </li>
        ))}
        {rows.length % 2 === 1 ? (
          <li className="register-empty-row hidden min-h-12 grid-cols-[2rem_2.5rem_minmax(0,1fr)] border-b border-border font-display" aria-hidden="true">
            <span className="h-full border-r border-border" />
            <span className="h-full border-r border-border" />
            <span className="h-full border-r border-border" />
          </li>
        ) : null}
      </ol>

      {rows.length > 0 ? (
        <nav
          aria-label="Sidnavigering för checklistan"
          className="mt-2 grid grid-cols-[1fr_auto_1fr] border border-border font-display text-xs italic text-text-muted"
        >
          <button
            type="button"
            disabled={searchLoading || !hasPrevious}
            onClick={() => onChangePage(resultPage - 1)}
            className="border-r border-border px-3 py-2 text-center underline underline-offset-2 hover:text-text disabled:text-text-faint disabled:no-underline"
          >
            ← Föreg. blad
          </button>
          <span className="flex items-baseline justify-center gap-2 px-4 py-2">
            <span className="not-italic text-text-faint">Blad</span>
            <span className="not-italic tabular-nums text-text">{String(resultPage).padStart(3, "0")}</span>
            <span className="not-italic text-text-faint">· Poster</span>
            <span className="not-italic tabular-nums text-text">{resultCount}</span>
          </span>
          <button
            type="button"
            disabled={searchLoading || !hasNext}
            onClick={() => onChangePage(resultPage + 1)}
            className="border-l border-border px-3 py-2 text-center underline underline-offset-2 hover:text-text disabled:text-text-faint disabled:no-underline"
          >
            Nästa blad →
          </button>
        </nav>
      ) : null}
    </>
  )
}
