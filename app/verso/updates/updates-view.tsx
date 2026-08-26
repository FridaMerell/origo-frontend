"use client"

import Link from "next/link"
import { useUpdateData } from "@/app/lib/update-context"
import { useUsers, getUserLabel } from "@/app/lib/user-context"
import { Card } from "@/app/components/ui/Card"
import { ListTable } from "@/app/components/ui/ListTable"
import { Avatar } from "@/app/components/ui/Avatar"
import { Drawer } from "@/app/components/ui/Drawer"
import UpdateForm from "@/app/verso/update-form"
import { formatDateShort } from "@/app/lib/format-date"

export default function UpdatesView() {
  const { updates } = useUpdateData()
  const users = useUsers()

  const sorted = [...updates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="flex flex-1 flex-col gap-5 p-7">
      <div className="flex items-baseline justify-between">
        <h1 className="m-0 font-display text-2xl font-semibold text-text">Uppdateringar</h1>
        <Drawer trigger="Lägg till uppdatering" triggerSize={'sm'} title="Ny uppdatering">
          <UpdateForm />
        </Drawer>
      </div>

      <Card className="overflow-hidden p-0">
        {sorted.length > 0 ? (
          <ListTable
            showHeader={false}
            columns={[
              {
                key: "entry",
                render: (e) => (
                  <Link href={`/updates/${e.id}`} className="flex w-full justify-between items-center gap-3 no-underline">
                    <Avatar name={getUserLabel(users, e.author)} size={28} />
                    <div className="flex min-w-0 flex-1 flex-col grow">
                      <span className="truncate text-text">{e.title}</span>
                      <span className="text-xs text-text-faint">{e.content}</span>
                    </div>

                  </Link>
                ),
              },
              {
                key: "date",
                width: "120px",
                render: (e) => (
                  <span className="text-right text-xs text-text-faint">
                    {formatDateShort(e.created_at)}
                  </span>
                ),
              }
            ]}
            rows={sorted.map((e) => ({ id: e.id, item: e }))}
          />
        ) : (
          <div className="p-4 text-text-muted">Inga uppdateringar.</div>
        )}
      </Card>
    </div>
  )
}
