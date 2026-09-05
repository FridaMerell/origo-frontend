import type { FluxTask } from "@/app/lib/dal";

export function sortFluxTasks(tasks: FluxTask[]): FluxTask[] {
  return tasks.slice().sort((a, b) => {
    const deadlineOrder = (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");
    if (deadlineOrder !== 0) return deadlineOrder;

    return a.created_at.localeCompare(b.created_at);
  });
}
