"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import {
  fluxMilestoneFormSchema,
  fluxProjectFormSchema,
  fluxTaskFormSchema,
  fluxUpdateFormSchema,
  type FluxMilestoneFormValues,
  type FluxProjectFormValues,
  type FluxTaskFormValues,
  type FluxUpdateFormValues,
} from "@/app/lib/schemas"

export type FluxActionState = { error?: string; success?: boolean } | undefined

function firstErrorMessage(detail: string, status: number): string {
  try {
    const parsed = JSON.parse(detail)
    const firstKey = Object.keys(parsed)[0]
    const firstValue = firstKey ? parsed[firstKey] : undefined
    if (Array.isArray(firstValue)) return String(firstValue[0])
    if (typeof firstValue === "string") return firstValue
  } catch {
    // not JSON, fall through to the raw detail below
  }
  return detail || `Ett fel uppstod (${status}).`
}

async function fluxRequest(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: Record<string, unknown>
): Promise<{ error?: string }> {
  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.ok) return {}

  const detail = await response.text().catch(() => "")
  return { error: firstErrorMessage(detail, response.status) }
}

export async function createProject(
  data: FluxProjectFormValues,
  files: string[],
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxProjectFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(FLUX_ENDPOINTS.projects, "POST", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function updateProject(
  id: number,
  data: FluxProjectFormValues,
  files: string[],
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxProjectFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.projects}${id}/`, "PATCH", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function deleteProject(id: number, path?: string): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.projects}${id}/`, "DELETE")
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function createMilestone(
  projectId: number,
  data: FluxMilestoneFormValues,
  files: string[],
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxMilestoneFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(FLUX_ENDPOINTS.milestones, "POST", {
    project: projectId,
    ...parsed.data,
    files,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function updateMilestone(
  id: number,
  data: FluxMilestoneFormValues,
  files: string[],
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxMilestoneFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.milestones}${id}/`, "PATCH", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function deleteMilestone(id: number, path?: string): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.milestones}${id}/`, "DELETE")
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function createTask(
  data: FluxTaskFormValues,
  parentId: number | null,
  files: string[],
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxTaskFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(FLUX_ENDPOINTS.tasks, "POST", {
    ...parsed.data,
    parent: parentId,
    files,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function updateTask(
  id: number,
  data: FluxTaskFormValues,
  files: string[],
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxTaskFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.tasks}${id}/`, "PATCH", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function deleteTask(id: number, path?: string): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.tasks}${id}/`, "DELETE")
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function createUpdate(
  projectId: number,
  milestoneId: number | null,
  taskId: number | null,
  data: FluxUpdateFormValues,
  files: string[]
): Promise<FluxActionState> {
  const parsed = fluxUpdateFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(FLUX_ENDPOINTS.updates, "POST", {
    project: projectId,
    milestone: milestoneId,
    task: taskId,
    ...parsed.data,
    files,
  })
  if (error) return { error }

  revalidatePath("/flux")
  return { success: true }
}

export async function updateUpdate(
  id: number,
  data: FluxUpdateFormValues,
  files: string[]
): Promise<FluxActionState> {
  const parsed = fluxUpdateFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.updates}${id}/`, "PATCH", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  revalidatePath("/flux")
  return { success: true }
}

export async function deleteUpdate(id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.updates}${id}/`, "DELETE")
  if (error) return { error }

  revalidatePath("/flux")
  return { success: true }
}

export async function toggleTaskStatus(id: number, done: boolean, path?: string): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.tasks}${id}/`, "PATCH", {
    status: done ? "done" : "not_started",
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function addSubtask(
  parentId: number,
  projectId: number,
  milestoneId: number | null,
  title: string,
  path?: string
): Promise<FluxActionState> {
  if (!title.trim()) return { error: "Alla fält måste fyllas i." }

  const { error } = await fluxRequest(FLUX_ENDPOINTS.tasks, "POST", {
    project: projectId,
    parent: parentId,
    milestone: milestoneId,
    title: title.trim(),
    priority: "medium",
    status: "not_started",
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}
