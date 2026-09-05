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
      </ol>

      {hasPrevious || hasNext ? (
        <nav
          aria-label="Sidnavigering för checklistan"
          className="flex items-center justify-between border-b border-border py-3 font-display text-xs italic"
        >
          {hasPrevious ? (
            <button
              type="button"
              disabled={searchLoading}
              onClick={() => onChangePage(resultPage - 1)}
              className="underline underline-offset-4 disabled:text-text-faint"
            >
              ← Föregående
            </button>
          ) : <span />}
          <span className="text-text-muted">{resultCount} träffar · sida {resultPage}</span>
          {hasNext ? (
            <button
              type="button"
              disabled={searchLoading}
              onClick={() => onChangePage(resultPage + 1)}
              className="underline underline-offset-4 disabled:text-text-faint"
            >
              Nästa →
            </button>
          ) : <span />}
        </nav>
      ) : null}
    </>
  )
}
