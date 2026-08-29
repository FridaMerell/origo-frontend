"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Icon } from "@/app/components/ui/Icon"
import { SwedenMap, type SwedenMapPoint } from "@/app/tempus/ui/biotope-map/SwedenMap"

export default function ObservationMapDialog({
  children,
  caption,
  points,
}: {
  children: ReactNode
  caption: string
  points: readonly SwedenMapPoint[]
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block h-full min-h-24 w-full overflow-hidden text-left"
        aria-label="Öppna karta över dina observationer"
      >
        {children}
        <div className="absolute inset-0 bg-linear-to-t from-surface/75 via-transparent to-transparent" />
        <span className="absolute bottom-1.5 left-2 flex items-center gap-1.5 font-display text-[9px] italic text-text-muted group-hover:text-text">
          {caption}
          <Icon name="expand" size={10} />
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="observation-map-title">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/70"
            onClick={() => setOpen(false)}
            aria-label="Stäng kartan"
          />
          <section className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-card border border-border bg-surface shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[.16em] text-text-faint">Observationernas utbredning</p>
                <h2 id="observation-map-title" className="mt-0.5 font-display text-xl font-semibold">Dina observationer i Sverige</h2>
                <p className="mt-1 text-xs text-text-muted">
                  {points.length} {points.length === 1 ? "observation med position" : "observationer med position"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
                aria-label="Stäng"
              >
                <Icon name="x" size={17} />
              </button>
            </header>

            <div className="relative min-h-0 flex-1 overflow-auto bg-surface-2/30 p-3 sm:p-5">
              <SwedenMap
                points={points}
                pointRadius={10}
                showLakeLabels
                title="Sverigekarta med dina observationer markerade"
                className="mx-auto max-w-full"
                style={{ height: "min(68vh, 42rem)", width: "auto" }}
              />
              {points.length === 0 ? (
                <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded border border-border bg-surface/90 px-4 py-3 text-center text-sm text-text-muted sm:inset-x-1/4">
                  Det finns ännu inga observationer med sparad position.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
