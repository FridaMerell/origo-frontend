import type { FluxTaskStatus } from "@/app/lib/dal";
import { isoDateKey } from "@/app/lib/formatters";

export function isTaskOverdue(
  dueDate: string | null,
  status: FluxTaskStatus,
  referenceDate = new Date(),
): boolean {
  return Boolean(dueDate && status !== "done" && dueDate < isoDateKey(referenceDate));
}

/** Shared background/hover treatment for a row representing an overdue task. */
export const OVERDUE_ROW_TONE = "bg-danger-wash/20 hover:bg-danger-wash/30";
