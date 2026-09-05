"use client"

import { Card } from "../components/ui/Card"
import { Avatar } from "../components/ui/Avatar"
import { ListTable } from "../components/ui/ListTable"
import { useUpdateData } from "./_state/update-context"
import { useUsers, getUserLabel } from "../lib/user-context"

export function UpdatesWidget() {
  const { updates } = useUpdateData()
  const users = useUsers()
  return <Card className="w-full col-span-6 md:col-span-3 lg:col-span-3 gap-5 flex flex-col justify-between">
    {updates && updates.length > 0 ?
      (
        <ListTable
          showHeader={false}
          caption={'Nyligen uppdaterat'}
          columns={[{
            key: "entry", render: (e) => (
              <div className="flex items-center gap-3">
                <Avatar name={getUserLabel(users, e.author)} size={28} />
                <div className="flex flex-col">
                  <span>{e.title}</span>
                  <span className="text-xs text-text-faint">Skickat av {getUserLabel(users, e.author)}</span>
                </div>
              </div>
            )
          }]}
          rows={updates.map((e) => ({ id: e.id, item: e }))}
        />
      )
      : (
        <div className="mb-5 text-text-muted">Inga uppdateringar.</div>
      )
    }
    <div>

    </div>
  </Card>
}
