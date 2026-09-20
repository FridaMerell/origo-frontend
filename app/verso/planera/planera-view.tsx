"use client"

import { GroupedList, groupItems } from "@/app/components/ui/GroupedList"
import { Drawer } from "@/app/components/ui/Drawer"
import { useVentureData } from "@/app/verso/_state/verso-context"
import { VentureForm } from "@/app/verso/planera/venture-form"
import { priorityLabel } from "@/app/verso/planera/venture-priority"
import type { Venture } from "@/app/lib/dal"

export default function PlaneraView() {
  const { ventures } = useVentureData()
  const sorted = [...ventures].sort((a, b) => a.priority - b.priority)
  const groups = groupItems(sorted, (venture) => priorityLabel(venture.priority))

  return (
    <div className="flex flex-1 flex-col gap-4 p-7">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-display font-semibold">Planering</h1>
        <Drawer trigger="Nytt projekt" triggerSize="sm" title="Nytt projekt">
          <VentureForm />
        </Drawer>
      </div>

      <GroupedList<Venture>
        groups={groups}
        emptyMessage="Inga projekt registrerade ännu."
        getKey={(venture) => venture.id}
        getHref={(venture) => `/planera/${venture.id}`}
        renderRow={(venture) => (
          <>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm text-text">{venture.name}</span>
              <span className="truncate text-xs text-text-faint">{venture.description}</span>
            </span>
            <span className="flex shrink-0 items-center gap-4 text-xs text-text-faint">
              {venture.budget > 0 && (
                <span className="font-mono text-sm text-text">
                  {venture.total_spent} / {venture.budget}
                </span>
              )}
              <span>
                {venture.finished_tasks_count}/{venture.total_tasks_count} delmål
              </span>
            </span>
          </>
        )}
      />
    </div>
  )
}
