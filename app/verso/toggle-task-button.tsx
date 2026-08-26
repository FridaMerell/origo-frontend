"use client"

import { useTransition } from "react"
import { usePathname } from "next/navigation"
import { setVentureTaskCompleted } from "@/app/actions/venture-task"
import { Icon } from "@/app/components/ui/Icon"

export function ToggleTaskButton({
  id,
  completed,
  className = "",
}: {
  id: string
  completed: boolean
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const pathname = usePathname()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        startTransition(() => {
          setVentureTaskCompleted(id, !completed, pathname)
        })
      }}
      className={`flex items-center gap-1.5 text-sm ${completed ? "text-success" : "text-text-muted hover:text-accent"} ${className}`}
    >
      <Icon name={completed ? "check-circle-2" : "circle"} size={14} />
      {completed ? "Klarmarkerad" : "Markera som klar"}
    </button>
  )
}
