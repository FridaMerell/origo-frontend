"use client"

import { GroupedList, groupItems } from "@/app/components/ui/GroupedList"
import { Drawer } from "@/app/components/ui/Drawer"
import { useVentureData } from "@/app/verso/_state/verso-context"
import { DrawingForm } from "@/app/verso/ritningar/drawing-form"
import type { Drawing } from "@/app/lib/dal"

const NO_VENTURE = "Utan projekt"

export default function DrawingsView({ drawings }: { drawings: Drawing[] }) {
  const { ventures } = useVentureData()
  const ventureName = (id: string | null) =>
    id ? (ventures.find((v) => String(v.id) === String(id))?.name ?? NO_VENTURE) : NO_VENTURE
  const groups = groupItems(drawings, (drawing) => ventureName(drawing.venture))

  return (
    <div className="container flex flex-1 flex-col gap-4 py-5 sm:py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-display font-semibold">Ritningar</h1>
        <Drawer trigger="Ny ritning" triggerSize="sm" title="Ny ritning">
          <DrawingForm />
        </Drawer>
      </div>

      <GroupedList<Drawing>
        groups={groups}
        emptyMessage="Inga ritningar ännu."
        getKey={(drawing) => drawing.id}
        getHref={(drawing) => `/ritningar/${drawing.id}`}
        renderRow={(drawing) => (
          <>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm text-text">{drawing.name}</span>
              <span className="truncate text-xs text-text-faint">{drawing.description}</span>
            </span>
            <span className="shrink-0 text-xs text-text-faint">
              {drawing.pages.length} {drawing.pages.length === 1 ? "sida" : "sidor"} · {drawing.unit}
            </span>
          </>
        )}
      />
    </div>
  )
}
