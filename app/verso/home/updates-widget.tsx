"use client"

import { Card } from "../../components/ui/Card"
import { useUpdateData } from "../_state/update-context"
import { useUsers, getUserLabel } from "../../lib/user-context"
import { ListChecks } from "lucide-react"
export function UpdatesWidget() {
  const { updates } = useUpdateData()
  const users = useUsers()
  return <Card className="w-full col-span-6 md:col-span-3 lg:col-span-3 gap-5 flex flex-col justify-between">
    <span className="text-text-faint text-xs ">
      <ListChecks name="check-list" size={13} className="inline-block mr-1" />
      Utgifter i år
    </span>
    {updates?.map(u => {
      return "Hej"
    })}
  </Card>
}
