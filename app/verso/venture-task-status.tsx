import { Badge, type BadgeVariant } from "@/app/components/ui/Badge"
import type { VentureTask } from "@/app/lib/dal"

export type VentureTaskStatus = "not_started" | "in_progress" | "done"

const STATUS_LABEL: Record<VentureTaskStatus, string> = {
  not_started: "Ej påbörjad",
  in_progress: "Under arbete",
  done: "Klar",
}

const STATUS_VARIANT: Record<VentureTaskStatus, BadgeVariant> = {
  not_started: "neutral",
  in_progress: "warning",
  done: "success",
}

export function ventureTaskStatus(task: Pick<VentureTask, "completed" | "status">): VentureTaskStatus {
  return task.status ?? (task.completed ? "done" : "not_started")
}

export function VentureTaskStatusBadge({ task }: { task: Pick<VentureTask, "completed" | "status"> }) {
  const status = ventureTaskStatus(task)

  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
