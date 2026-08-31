"use client"

import { usePathname } from "next/navigation"
import { useTransition } from "react"
import { deleteMilestone } from "@/app/actions/flux"
import { Icon } from "@/app/components/ui/Icon"

export function DeleteMilestoneButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition()
  const pathname = usePathname()

  return (
    <button
      type="button"
      aria-label="Ta bort delmål"
      title="Ta bort delmål"
      disabled={pending}
      onClick={(event) => {
        event.stopPropagation()
        startTransition(() => { deleteMilestone(id, pathname) })
      }}
      className="rounded-md p-1 text-text-faint transition-colors hover:bg-danger-wash hover:text-danger disabled:opacity-50"
    >
      <Icon name="trash-2" size={14} />
    </button>
  )
}
