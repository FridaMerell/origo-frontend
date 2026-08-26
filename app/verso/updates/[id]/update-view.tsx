"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useUpdateData } from "@/app/lib/update-context"
import { useVentureData } from "@/app/lib/venture-context"
import { useUsers, getUserLabel } from "@/app/lib/user-context"
import { Card } from "@/app/components/ui/Card"
import { Avatar } from "@/app/components/ui/Avatar"
import { Icon } from "@/app/components/ui/Icon"
import { Drawer } from "@/app/components/ui/Drawer"
import { Gallery } from "@/app/components/ui/Gallery"
import UpdateForm from "@/app/verso/update-form"

export default function UpdateView() {
  const { id } = useParams<{ id: string }>()
  const { updates } = useUpdateData()
  const { ventures, ventureTasks } = useVentureData()
  const users = useUsers()

  const update = updates.find((u) => String(u.id) === id)

  if (!update) {
    return (
      <div className="flex flex-1 flex-col gap-5 p-7">
        <Link href="/updates" className="flex items-center gap-1 text-sm text-text-muted hover:text-accent">
          <Icon name="chevron-left" size={14} />
          Uppdateringar
        </Link>
        <div className="text-text-muted">Uppdateringen kunde inte hittas.</div>
      </div>
    )
  }

  const linkedVenture = update.venture ? ventures.find((v) => String(v.id) === String(update.venture)) : null
  const linkedTask = update.task ? ventureTasks.find((t) => String(t.id) === String(update.task)) : null

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <Link href="/updates" className="flex items-center gap-1 text-sm text-text-muted hover:text-accent">
        <Icon name="chevron-left" size={14} />
        Uppdateringar
      </Link>

      <div className="flex items-baseline justify-between">
        <h1 className="m-0 font-display text-2xl font-semibold text-text">{update.title}</h1>
        <Drawer trigger="Redigera" triggerVariant="secondary" triggerSize="sm" title="Redigera uppdatering">
          <UpdateForm update={update} />
        </Drawer>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={getUserLabel(users, update.author)} size={32} />
          <div className="flex flex-col">
            <span className="text-sm text-text">{getUserLabel(users, update.author)}</span>
            <span className="text-xs text-text-faint">
              {new Date(update.created_at).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-sm text-text">{update.content}</p>

        {(linkedVenture || linkedTask) && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Icon name="link" size={14} />
            {linkedTask ? linkedTask.name : linkedVenture?.name}
          </div>
        )}

        <Gallery files={update.files} />
      </Card>
    </div>
  )
}
