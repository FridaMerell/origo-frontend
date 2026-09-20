"use client"

import Link from "next/link"
import { Badge } from "@/app/components/ui/Badge"
import { Card } from "@/app/components/ui/Card"
import { Drawer } from "@/app/components/ui/Drawer"
import UpdateForm from "@/app/verso/forms/update-form"
import { getUserLabel, useUsers } from "@/app/lib/user-context"
import { formatDate } from "@/app/lib/formatters"
import type { VersoUpdate } from "@/app/lib/dal"

export function UpdateCard({ update, taskLabel }: { update: VersoUpdate; taskLabel?: string }) {
  const users = useUsers()

  return (
    <Card className="flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href={`/updates/${update.id}`} className="text-sm font-semibold text-text hover:text-accent">
            {update.title}
          </Link>
          {taskLabel && (
            <span className="self-start">
              <Badge variant="neutral">{taskLabel}</Badge>
            </span>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
          <span className="truncate text-xs text-text-faint">
            {getUserLabel(users, update.author)} ·{" "}
            {formatDate(update.created_at)}
          </span>
          <Drawer trigger="Redigera" triggerVariant="ghost" triggerSize="sm" title="Redigera uppdatering">
            <UpdateForm update={update} />
          </Drawer>
        </div>
      </div>
      <Link href={`/updates/${update.id}`}>
        <p className="line-clamp-2 text-sm text-text-muted">{update.content}</p>
      </Link>
    </Card>
  )
}
