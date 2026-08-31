"use client"

import { useTransition } from "react"
import { usePathname } from "next/navigation"
import { setVentureTaskStatus } from "@/app/actions/venture-task"
import { Icon } from "@/app/components/ui/Icon"
import type { VentureTaskStatus } from "./venture-task-status"

export function ToggleTaskButton({
  id,
  status,
  className = "",
}: {
  id: string
  status: VentureTaskStatus
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
          setVentureTaskStatus(id, status === "done" ? "in_progress" : "done", pathname)
        })
      }}
      aria-label={status === "done" ? "Öppna uppgift" : "Stäng uppgift"}
      aria-pressed={status === "done"}
      className={`flex items-center gap-1.5 text-sm ${status === "done" ? "text-success" : "text-text-muted hover:text-accent"} ${className}`}
    >
      <Icon name={status === "done" ? "check-circle-2" : "circle"} size={14} />
      {status === "done" ? "Stängd" : "Öppen"}
    </button>
  )
}
