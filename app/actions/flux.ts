"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

export type FluxActionState =
  | { errors?: Record<string, string[]>; success?: boolean }
  | undefined

async function fluxRequest(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: Record<string, unknown>
): Promise<{ errors?: Record<string, string[]> }> {
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

  const errors = await response.json().catch(() => ({}))
  return { errors }
}

function parseIdList(formData: FormData, key: string): number[] {
  return formData
    .getAll(key)
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value))
}

export async function createProject(
  _prevState: FluxActionState,
  formData: FormData
): Promise<FluxActionState> {
  const name = formData.get("name")
  const description = formData.get("description")
  const members = parseIdList(formData, "members")
  const path = formData.get("path")

  if (typeof name !== "string" || !name) {
    return { errors: { name: ["This field is required."] } }
  }

  const { errors } = await fluxRequest(FLUX_ENDPOINTS.projects, "POST", {
    name,
    description: typeof description === "string" ? description : "",
    members,
  })

  if (errors) return { errors }

  revalidatePath(typeof path === "string" && path ? path : "/flux")
  return { success: true }
}

export async function updateProject(
  id: number,
  _prevState: FluxActionState,
  formData: FormData
): Promise<FluxActionState> {
  const name = formData.get("name")
  const description = formData.get("description")
  const members = parseIdList(formData, "members")
  const path = formData.get("path")

  const { errors } = await fluxRequest(`${FLUX_ENDPOINTS.projects}${id}/`, "PATCH", {
    ...(typeof name === "string" && name ? { name } : {}),
    ...(typeof description === "string" ? { description } : {}),
    ...(formData.has("members_field") ? { members } : {}),
  })

  if (errors) return { errors }

  revalidatePath(typeof path === "string" && path ? path : "/flux")
  return { success: true }
}

export async function deleteProject(id: number, path?: string): Promise<FluxActionState> {
  const { errors } = await fluxRequest(`${FLUX_ENDPOINTS.projects}${id}/`, "DELETE")
  if (errors) return { errors }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function createMilestone(
  _prevState: FluxActionState,
  formData: FormData
): Promise<FluxActionState> {
  const project = formData.get("project")
  const title = formData.get("title")
  const description = formData.get("description")
  const status = formData.get("status")
  const targetDate = formData.get("target_date")
  const path = formData.get("path")

  if (typeof project !== "string" || !project) {
    return { errors: { project: ["This field is required."] } }
  }
  if (typeof title !== "string" || !title) {
    return { errors: { title: ["This field is required."] } }
  }

  const { errors } = await fluxRequest(FLUX_ENDPOINTS.milestones, "POST", {
    project: Number(project),
    title,
    description: typeof description === "string" ? description : "",
    status: typeof status === "string" && status ? status : "not_started",
    target_date: typeof targetDate === "string" && targetDate ? targetDate : null,
  })

  if (errors) return { errors }

  revalidatePath(typeof path === "string" && path ? path : "/flux")
  return { success: true }
}

export async function updateMilestone(
  id: number,
  _prevState: FluxActionState,
  formData: FormData
): Promise<FluxActionState> {
  const title = formData.get("title")
  const description = formData.get("description")
  const status = formData.get("status")
  const targetDate = formData.get("target_date")
  const path = formData.get("path")

  const { errors } = await fluxRequest(`${FLUX_ENDPOINTS.milestones}${id}/`, "PATCH", {
    ...(typeof title === "string" && title ? { title } : {}),
    ...(typeof description === "string" ? { description } : {}),
    ...(typeof status === "string" && status ? { status } : {}),
    ...(typeof targetDate === "string" ? { target_date: targetDate || null } : {}),
  })

  if (errors) return { errors }

  revalidatePath(typeof path === "string" && path ? path : "/flux")
  return { success: true }
}

export async function deleteMilestone(id: number, path?: string): Promise<FluxActionState> {
  const { errors } = await fluxRequest(`${FLUX_ENDPOINTS.milestones}${id}/`, "DELETE")
  if (errors) return { errors }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function createTask(
  _prevState: FluxActionState,
  formData: FormData
): Promise<FluxActionState> {
  const project = formData.get("project")
  const title = formData.get("title")
  const description = formData.get("description")
  const milestone = formData.get("milestone")
  const parent = formData.get("parent")
  const dueDate = formData.get("due_date")
  const priority = formData.get("priority")
  const status = formData.get("status")
  const assignees = parseIdList(formData, "assignees")
  const requirements = parseIdList(formData, "requirements")
  const path = formData.get("path")

  if (typeof project !== "string" || !project) {
    return { errors: { project: ["This field is required."] } }
  }
  if (typeof title !== "string" || !title) {
    return { errors: { title: ["This field is required."] } }
  }

  const { errors } = await fluxRequest(FLUX_ENDPOINTS.tasks, "POST", {
    project: Number(project),
    title,
    description: typeof description === "string" ? description : "",
    milestone: typeof milestone === "string" && milestone ? Number(milestone) : null,
    parent: typeof parent === "string" && parent ? Number(parent) : null,
    due_date: typeof dueDate === "string" && dueDate ? dueDate : null,
    priority: typeof priority === "string" && priority ? priority : "medium",
    status: typeof status === "string" && status ? status : "not_started",
    assignees,
    requirements,
  })

  if (errors) return { errors }

  revalidatePath(typeof path === "string" && path ? path : "/flux")
  return { success: true }
}

export async function updateTask(
  id: number,
  _prevState: FluxActionState,
  formData: FormData
): Promise<FluxActionState> {
  const title = formData.get("title")
  const description = formData.get("description")
  const milestone = formData.get("milestone")
  const parent = formData.get("parent")
  const dueDate = formData.get("due_date")
  const priority = formData.get("priority")
  const status = formData.get("status")
  const assignees = parseIdList(formData, "assignees")
  const requirements = parseIdList(formData, "requirements")
  const path = formData.get("path")

  const { errors } = await fluxRequest(`${FLUX_ENDPOINTS.tasks}${id}/`, "PATCH", {
    ...(typeof title === "string" && title ? { title } : {}),
    ...(typeof description === "string" ? { description } : {}),
    ...(typeof milestone === "string" ? { milestone: milestone ? Number(milestone) : null } : {}),
    ...(typeof parent === "string" ? { parent: parent ? Number(parent) : null } : {}),
    ...(typeof dueDate === "string" ? { due_date: dueDate || null } : {}),
    ...(typeof priority === "string" && priority ? { priority } : {}),
    ...(typeof status === "string" && status ? { status } : {}),
    ...(formData.has("assignees_field") ? { assignees } : {}),
    ...(requirements.length ? { requirements } : {}),
  })

  if (errors) return { errors }

  revalidatePath(typeof path === "string" && path ? path : "/flux")
  return { success: true }
}

export async function deleteTask(id: number, path?: string): Promise<FluxActionState> {
  const { errors } = await fluxRequest(`${FLUX_ENDPOINTS.tasks}${id}/`, "DELETE")
  if (errors) return { errors }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function createUpdate(
  _prevState: FluxActionState,
  formData: FormData
): Promise<FluxActionState> {
  const project = formData.get("project")
  const milestone = formData.get("milestone")
  const task = formData.get("task")
  const content = formData.get("content")

  if (typeof project !== "string" || !project) {
    return { errors: { project: ["This field is required."] } }
  }
  if (typeof content !== "string" || !content) {
    return { errors: { content: ["This field is required."] } }
  }

  const { errors } = await fluxRequest(FLUX_ENDPOINTS.updates, "POST", {
    project: Number(project),
    milestone: typeof milestone === "string" && milestone ? Number(milestone) : null,
    task: typeof task === "string" && task ? Number(task) : null,
    content,
  })

  if (errors) return { errors }

  revalidatePath("/flux")
  return { success: true }
}

export async function updateUpdate(
  id: number,
  _prevState: FluxActionState,
  formData: FormData
): Promise<FluxActionState> {
  const content = formData.get("content")

  const { errors } = await fluxRequest(`${FLUX_ENDPOINTS.updates}${id}/`, "PATCH", {
    ...(typeof content === "string" && content ? { content } : {}),
  })

  if (errors) return { errors }

  revalidatePath("/flux")
  return { success: true }
}

export async function deleteUpdate(id: number): Promise<FluxActionState> {
  const { errors } = await fluxRequest(`${FLUX_ENDPOINTS.updates}${id}/`, "DELETE")
  if (errors) return { errors }

  revalidatePath("/flux")
  return { success: true }
}

export async function toggleTaskStatus(id: number, done: boolean, path?: string): Promise<FluxActionState> {
  const { errors } = await fluxRequest(`${FLUX_ENDPOINTS.tasks}${id}/`, "PATCH", {
    status: done ? "done" : "not_started",
  })
  if (errors) return { errors }

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
  if (!title.trim()) return { errors: { title: ["This field is required."] } }

  const { errors } = await fluxRequest(FLUX_ENDPOINTS.tasks, "POST", {
    project: projectId,
    parent: parentId,
    milestone: milestoneId,
    title: title.trim(),
    priority: "medium",
    status: "not_started",
  })
  if (errors) return { errors }

  revalidatePath(path || "/flux")
  return { success: true }
}
