"use client";

import { Badge } from "@/app/components/ui/Badge";
import { formatDate, formatDateShort } from "@/app/lib/formatters";
import { isTaskOverdue } from "@/app/lib/flux-task-dates";
import type { FluxTaskStatus } from "@/app/lib/dal";

export function TaskDueDate({
  dueDate,
  status,
  compact = false,
  className = "",
}: {
  dueDate: string | null;
  status: FluxTaskStatus;
  compact?: boolean;
  className?: string;
}) {
  if (!dueDate) {
    return <span className={`font-mono text-text-faint ${className}`}>Ingen deadline</span>;
  }

  const overdue = isTaskOverdue(dueDate, status);

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className={overdue ? "font-semibold text-danger" : "font-mono text-text-faint"}>
        {compact ? formatDateShort(dueDate) : formatDate(dueDate)}
      </span>
      {overdue && <Badge variant="danger">Försenad</Badge>}
    </span>
  );
}
