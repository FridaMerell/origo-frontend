import { cache } from "react"
import { ACCOUNTS_ENDPOINTS, FLUX_ENDPOINTS } from "@/app/lib/config"
import { fetchItem, fetchList } from "@/app/lib/dal/client"

export type FluxProject = {
  id: number
  name: string
  description: string
  members: number[]
  files: string[]
  created_at: string
  updated_at: string
}

export type FluxMilestoneStatus = "not_started" | "in_progress" | "done"

export type FluxMilestone = {
  id: number
  project: number
  title: string
  description: string
  status: FluxMilestoneStatus
  target_date: string | null
  files: string[]
  update_count: number
  created_at: string
  updated_at: string
}

export type TaskPriority = "low" | "medium" | "high"

export type TaskStatus = "not_started" | "in_progress" | "done"

export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly" | "yearly"

export interface TaskFile {
  [key: string]: unknown
}

export interface TaskBase {
  project: number
  milestone: number | null
  parent: number | null
  requirements: number[]
  assignees: number[]
  title: string
  description: string
  due_date: string | null
  recurrence: TaskRecurrence
  recurrence_interval: number
  recurrence_end_date: string | null
  priority: TaskPriority
  status: TaskStatus
  files: TaskFile[]
}

export interface Task extends TaskBase {
  id: number
  subtasks: number[]
  required_by: number[]
  recurrence_source: number | null
  created_at: string
  updated_at: string
  update_count: number
}

export type TaskCreatePayload = TaskBase

export type TaskUpdatePayload = Partial<TaskBase>

export type FluxTaskPriority = TaskPriority

export type FluxTaskStatus = TaskStatus

export type FluxTaskRecurrence = TaskRecurrence

export type FluxTaskFile = TaskFile

export type FluxTaskBase = TaskBase

export type FluxTask = Task

export type FluxUpdate = {
  id: number
  project: number
  milestone: number | null
  task: number | null
  author: number | null
  content: string
  files: string[]
  created_at: string
  updated_at: string
}

export type FluxDocumentKind = "markdown" | "flowchart" | "database_schema"

export type FluxDocument = {
  id: number
  project: number
  milestone: number | null
  task: number | null
  title: string
  kind: FluxDocumentKind
  content: string
  created_at: string
  updated_at: string
}

export type FluxUser = {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string
}

export type FluxBoard = {
  project: FluxProject
  projects: FluxProject[]
  milestones: FluxMilestone[]
  tasks: FluxTask[]
  updates: FluxUpdate[]
  documents: FluxDocument[]
  users: FluxUser[]
}

export type FluxTimeline = {
  projects: FluxProject[]
  milestones: FluxMilestone[]
  tasks: FluxTask[]
  updates: FluxUpdate[]
  documents: FluxDocument[]
  users: FluxUser[]
}

export const getFluxBoard = cache(
  (id: string): Promise<FluxBoard | null> =>
    fetchItem<FluxBoard>(FLUX_ENDPOINTS.projectBoard(id))
)

export const getFluxTimeline = cache(
  (): Promise<FluxTimeline | null> => fetchItem<FluxTimeline>(FLUX_ENDPOINTS.timeline)
)

export const getFluxUsers = cache((ids: number[]): Promise<FluxUser[]> => {
  if (ids.length === 0) return Promise.resolve([])
  const search = new URLSearchParams()
  for (const id of ids) search.append("id", String(id))
  return fetchList(`${ACCOUNTS_ENDPOINTS.users}?${search}`)
})

export const getUsers = cache((): Promise<FluxUser[]> => fetchList(ACCOUNTS_ENDPOINTS.users))

export const getFluxProjects = cache(
  (params?: { members?: string }): Promise<FluxProject[]> =>
    fetchList(FLUX_ENDPOINTS.projects, params)
)

export const getFluxProject = cache(
  (id: string): Promise<FluxProject | null> =>
    fetchItem(`${FLUX_ENDPOINTS.projects}${id}/`)
)

export const getFluxMilestones = cache(
  (params?: { project?: string; status?: FluxMilestoneStatus }): Promise<FluxMilestone[]> =>
    fetchList(FLUX_ENDPOINTS.milestones, params)
)

export const getFluxMilestone = cache(
  (id: string): Promise<FluxMilestone | null> =>
    fetchItem(`${FLUX_ENDPOINTS.milestones}${id}/`)
)

export const getFluxTasks = cache(
  (params?: {
    project?: string
    milestone?: string
    parent?: string
    assignees?: string
    priority?: FluxTaskPriority
  }): Promise<FluxTask[]> => fetchList(FLUX_ENDPOINTS.tasks, params)
)

export const getFluxTask = cache(
  (id: string): Promise<FluxTask | null> => fetchItem(`${FLUX_ENDPOINTS.tasks}${id}/`)
)

export const getFluxUpdates = cache(
  (params?: {
    project?: string
    milestone?: string
    task?: string
  }): Promise<FluxUpdate[]> => fetchList(FLUX_ENDPOINTS.updates, params)
)

export const getFluxUpdate = cache(
  (id: string): Promise<FluxUpdate | null> => fetchItem(`${FLUX_ENDPOINTS.updates}${id}/`)
)

export const getFluxDocuments = cache(
  (params?: { project?: string; milestone?: string; task?: string }): Promise<FluxDocument[]> =>
    fetchList(FLUX_ENDPOINTS.documents, params)
)
