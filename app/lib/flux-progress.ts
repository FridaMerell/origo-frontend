import type { FluxTask } from "@/app/lib/dal"

export type Progress = { done: number; total: number; pct: number }

export function progressOf(tasks: FluxTask[]): Progress {
  const total = tasks.length
  const done = tasks.filter((task) => task.status === "done").length
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}
