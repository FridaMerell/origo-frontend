import type { FluxTaskStatus } from "@/app/lib/dal";

export function getLocalIsoDate(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isTaskOverdue(
  dueDate: string | null,
  status: FluxTaskStatus,
  referenceDate = new Date(),
): boolean {
  return Boolean(dueDate && status !== "done" && dueDate < getLocalIsoDate(referenceDate));
}

/** Shared background/hover treatment for a row representing an overdue task. */
export const OVERDUE_ROW_TONE = "bg-danger-wash/20 hover:bg-danger-wash/30";
