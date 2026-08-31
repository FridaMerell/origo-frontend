import { Badge, type BadgeVariant } from "@/app/components/ui/Badge"
import type { FluxTaskStatus } from "@/app/lib/dal"

const STATUS_LABEL: Record<FluxTaskStatus, string> = {
  not_started: "Ej påbörjad",
  in_progress: "Under arbete",
  done: "Klar",
}

const STATUS_VARIANT: Record<FluxTaskStatus, BadgeVariant> = {
  not_started: "neutral",
  in_progress: "warning",
  done: "success",
}

export function TaskStatusBadge({ status }: { status: FluxTaskStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
}
