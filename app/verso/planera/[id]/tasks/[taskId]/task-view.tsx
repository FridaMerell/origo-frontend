"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useVentureData } from "@/app/verso/_state/venture-context"
import { useUpdateData } from "@/app/verso/_state/update-context"
import { Card } from "@/app/components/ui/Card"
import { Icon } from "@/app/components/ui/Icon"
import { Drawer } from "@/app/components/ui/Drawer"
import UpdateForm from "@/app/verso/update-form"
import VentureTaskForm from "@/app/verso/venture-task-form"
import { UpdateCard } from "@/app/verso/update-card"
import { VentureTaskStatusBadge } from "@/app/verso/venture-task-status"

export default function VentureTaskView() {
  const { id, taskId } = useParams<{ id: string; taskId: string }>()
  const { ventures, ventureTasks } = useVentureData()
  const { updates } = useUpdateData()

  const venture = ventures.find((v) => String(v.id) === id)
  const task = ventureTasks.find((t) => String(t.id) === taskId)

  if (!venture || !task) {
    return (
      <div className="flex flex-1 flex-col gap-5 p-7">
        <Link href="/planera" className="flex items-center gap-1 text-sm text-text-muted hover:text-accent">
          <Icon name="chevron-left" size={14} />
          Planering
        </Link>
        <div className="text-text-muted">Uppgiften kunde inte hittas.</div>
      </div>
    )
  }

  const taskUpdates = updates.filter((u) => String(u.task) === String(task.id))

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <Link
        href={`/planera/${venture.id}`}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-accent"
      >
        <Icon name="chevron-left" size={14} />
        {venture.name}
      </Link>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="m-0 font-display text-2xl font-semibold text-text">{task.name}</h1>
          <VentureTaskStatusBadge task={task} />
        </div>
        <div className="flex items-center gap-2">
          <Drawer trigger="Redigera" triggerVariant="ghost" triggerSize="sm" title="Redigera uppgift">
            <VentureTaskForm venture={venture.id} task={task} />
          </Drawer>
          <Drawer trigger="Ny uppdatering" triggerVariant="secondary" triggerSize="sm" title="Ny uppdatering">
            <UpdateForm defaultVenture={venture.id} defaultTask={task.id} />
          </Drawer>
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap text-sm text-text">{task.description}</p>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-lg font-semibold text-text">Uppdateringar</h2>
        {taskUpdates.length === 0 ? (
          <div className="text-sm text-text-muted">Inga uppdateringar ännu.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {taskUpdates.map((update) => (
              <UpdateCard key={update.id} update={update} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
