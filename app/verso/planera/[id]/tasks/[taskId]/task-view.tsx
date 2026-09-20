"use client"

import { useParams } from "next/navigation"
import { useUpdateData, useVentureData } from "@/app/verso/_state/verso-context"
import { Card } from "@/app/components/ui/Card"
import { Drawer } from "@/app/components/ui/Drawer"
import UpdateForm from "@/app/verso/forms/update-form"
import VentureTaskForm from "@/app/verso/forms/venture-task-form"
import { UpdateCard } from "@/app/verso/updates/update-card"
import { VentureTaskStatusBadge } from "@/app/verso/planera/venture-task-status"
import { BackLink, DetailNotFound, SectionHeading } from "@/app/verso/ui/DetailPage"

export default function VentureTaskView() {
  const { id, taskId } = useParams<{ id: string; taskId: string }>()
  const { ventures, ventureTasks } = useVentureData()
  const { updates } = useUpdateData()

  const venture = ventures.find((v) => String(v.id) === id)
  const task = ventureTasks.find((t) => String(t.id) === taskId)

  if (!venture || !task) {
    return <DetailNotFound backHref="/planera" backLabel="Planering" message="Uppgiften kunde inte hittas." />
  }

  const taskUpdates = updates.filter((u) => String(u.task) === String(task.id))

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <BackLink href={`/planera/${venture.id}`}>{venture.name}</BackLink>

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
        <SectionHeading>Uppdateringar</SectionHeading>
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
