"use server"

import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxTaskFormSchema, type FluxTaskFormValues } from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"
import type { FluxTask } from "@/app/lib/dal"

export async function createTask(
  data: FluxTaskFormValues,
  parentId: number | null,
  files: string[],
): Promise<FluxActionState<FluxTask>> {
  const parsed = fluxTaskFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { data: task, error } = await fluxRequest<FluxTask>(FLUX_ENDPOINTS.tasks, "POST", {
    requirements: [],
    ...parsed.data,
    parent: parentId,
    files,
  })
  if (error) return { error }

  if (!task) return { error: "Uppgiften skapades, men kunde inte läsas tillbaka." }
  return { success: true, data: task }
}

export async function updateTask(
  id: number,
  data: FluxTaskFormValues,
  files: string[],
): Promise<FluxActionState<FluxTask>> {
  const parsed = fluxTaskFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { data: task, error } = await fluxRequest<FluxTask>(`${FLUX_ENDPOINTS.tasks}${id}/`, "PATCH", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  if (!task) return { error: "Uppgiften sparades, men kunde inte läsas tillbaka." }
  return { success: true, data: task }
}

export async function deleteTask(id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.tasks}${id}/`, "DELETE")
  if (error) return { error }

  return { success: true }
}

export async function toggleTaskStatus(
  id: number,
  status: FluxTaskFormValues["status"]
): Promise<FluxActionState> {
  const nextStatus = status === "not_started"
    ? "in_progress"
    : status === "in_progress"
      ? "done"
      : "not_started"
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.tasks}${id}/`, "PATCH", {
    status: nextStatus,
  })
  if (error) return { error }

  return { success: true }
}

export async function addSubtask(
  parentId: number,
  projectId: number,
  milestoneId: number | null,
  title: string,
): Promise<FluxActionState<FluxTask>> {
  if (!title.trim()) return { error: "Alla fält måste fyllas i." }

  const { data: task, error } = await fluxRequest<FluxTask>(FLUX_ENDPOINTS.tasks, "POST", {
    project: projectId,
    parent: parentId,
    milestone: milestoneId,
    title: title.trim(),
    description: "",
    requirements: [],
    assignees: [],
    due_date: null,
    recurrence: "none",
    recurrence_interval: 1,
    recurrence_end_date: null,
    priority: "medium",
    status: "not_started",
    files: [],
  })
  if (error) return { error }

  if (!task) return { error: "Deluppgiften skapades, men kunde inte läsas tillbaka." }
  return { success: true, data: task }
}
