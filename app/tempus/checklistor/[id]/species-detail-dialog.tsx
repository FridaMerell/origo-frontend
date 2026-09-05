"use client"

import Link from "next/link"
import type { SpeciesDetail } from "@/app/tempus/_actions/species"
import ObservationWidget from "@/app/tempus/observationer/observation-widget"
import SpeciesWidget from "@/app/tempus/taxa/species-widget"
import type { RegisterRow } from "./checklist-register"

export function SpeciesDetailDialog({
  row,
  data,
  loading,
  error,
  onClose,
}: {
  row: RegisterRow
  data: SpeciesDetail | null
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Uppgifter för ${row.commonName}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-card border border-border bg-surface px-5 py-8 text-sm text-text-muted">
            <span
              className="size-4 animate-spin rounded-full border-2 border-border border-t-accent"
              aria-hidden="true"
            />
            <span>Hämtar uppgifter…</span>
          </div>
        ) : error ? (
          <div className="rounded-card border border-border bg-surface px-5 py-8 text-center text-sm text-danger">
            {error}
          </div>
        ) : data?.observation ? (
          <ObservationWidget
            observation={data.observation}
            species={data.species}
            speciesHref={data.speciesHref}
            checklistNames={row.checklistNames}
            actions={
              <div className="flex items-center gap-3 font-body text-[10px] not-italic">
                <Link
                  href={`/observationer/${data.observation.id}`}
                  className="text-accent hover:text-accent-hover"
                >
                  Öppna observation
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-text-muted hover:text-text"
                >
                  Stäng
                </button>
              </div>
            }
          />
        ) : data?.species ? (
          <SpeciesWidget
            species={data.species}
            speciesHref={data.speciesHref}
          />
        ) : null}
      </div>
    </div>
  )
}
