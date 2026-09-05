"use client"

import { usePathname } from "next/navigation"
import { deleteMilestone } from "@/app/actions/flux"
import { DeleteButton } from "@/app/components/ui/DeleteButton"

export function DeleteMilestoneButton({ id }: { id: number }) {
  const pathname = usePathname()

  return (
    <DeleteButton
      label="Ta bort delmål"
      showTitle
      stopPropagation
      className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
      onDelete={() => { deleteMilestone(id, pathname) }}
    />
  )
}
