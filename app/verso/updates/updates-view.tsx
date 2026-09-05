"use client"

import { useUpdateData } from "@/app/verso/_state/update-context"
import { useUsers, getUserLabel } from "@/app/lib/user-context"
import { GroupedList, groupItems } from "@/app/components/ui/GroupedList"
import { Drawer } from "@/app/components/ui/Drawer"
import UpdateForm from "@/app/verso/update-form"
import { formatDateLong } from "@/app/lib/formatters"
import type { VersoUpdate } from "@/app/lib/dal"

const groupLabel = (date: string) => formatDateLong(date)

export default function UpdatesView() {
  const { updates } = useUpdateData()
  const users = useUsers()

  const sorted = [...updates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const groups = groupItems(sorted, (u) => groupLabel(u.created_at))

  return (
    <div className="flex flex-1 flex-col gap-4 p-7">
      <div className="flex items-baseline justify-between">
        <h1 className="m-0 font-display text-2xl font-semibold text-text">Uppdateringar</h1>
        <Drawer trigger="Lägg till uppdatering" triggerSize={'sm'} title="Ny uppdatering">
          <UpdateForm />
        </Drawer>
      </div>

      <GroupedList<VersoUpdate>
        groups={groups}
        emptyMessage="Inga uppdateringar."
        getKey={(update) => update.id}
        getHref={(update) => `/updates/${update.id}`}
        renderRow={(update) => (
          <>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm text-text">{update.title}</span>
              <span className="truncate text-xs text-text-faint">{update.content}</span>
            </span>
            <span className="shrink-0 text-xs text-text-faint">
              {getUserLabel(users, update.author)}
            </span>
          </>
        )}
      />
    </div>
  )
}
