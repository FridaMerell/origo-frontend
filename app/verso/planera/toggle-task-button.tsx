"use client"

import { useTransition } from "react"
import { usePathname } from "next/navigation"
import { setVentureTaskStatus } from "@/app/actions/venture-task"
import type { VentureTaskStatus } from "./venture-task-status"
import { CheckCircle2, Circle } from "lucide-react"

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
      {
        status === "done" ? (
          <CheckCircle2 size={14} className="text-success" />
        ) : (
          <Circle size={14} className="text-text-muted" />
        )
      }
      
      {status === "done" ? "Stängd" : "Öppen"}
    </button>
  )
}
