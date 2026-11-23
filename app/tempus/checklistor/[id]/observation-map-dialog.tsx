"use client"

import { useEffect, useState, type ReactNode } from "react"
import { loadChecklistObservationPoints } from "@/app/tempus/_actions/checklists"
import { SwedenMap, type SwedenMapPoint } from "@/app/tempus/ui/biotope-map/SwedenMap"
import { Expand } from "lucide-react"
import { Modal } from "@/app/components/ui/Modal"

export default function ObservationMapDialog({
  children,
  caption,
  checklistId,
}: {
  children: ReactNode
  caption: string
  checklistId: string
}) {
  const [open, setOpen] = useState(false)
  const [points, setPoints] = useState<readonly SwedenMapPoint[] | null>(null)

  useEffect(() => {
    if (!open || points !== null) return
    void loadChecklistObservationPoints(checklistId).then(setPoints)
  }, [checklistId, open, points])

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
          <Expand size={10} />
        </span>
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        size="lg"
        className="max-w-4xl"
        title="Dina observationer i Sverige"
        description={
          points === null
            ? "Laddar..."
            : `${points.length} ${points.length === 1 ? "observation med position" : "observationer med position"}`
        }
      >
        <div className="relative">
          {points ? <SwedenMap
            points={points}
            pointRadius={10}
            showLakeLabels
            autoZoom
            title="Sverigekarta med dina observationer markerade"
            className="mx-auto max-w-full"
            style={{ height: "min(68vh, 42rem)", width: "auto" }}
          /> : null}
          {points?.length === 0 ? (
            <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded border border-border bg-surface/90 px-4 py-3 text-center text-sm text-text-muted sm:inset-x-1/4">
              Det finns ännu inga observationer med sparad position.
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
