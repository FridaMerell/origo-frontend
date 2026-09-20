import { cache } from "react"
import { ACCOUNTS_ENDPOINTS, FLUX_ENDPOINTS } from "@/app/lib/config"
import { fetchItem, fetchList } from "@/app/lib/dal/client"

export type FluxProject = {
  id: number
  name: string
  description: string
  members: number[]
  files: string[]
  include_identity: boolean
  identity: number | null
  created_at: string
  updated_at: string
}

export type FluxMilestoneStatus = "not_started" | "in_progress" | "done"

export type FluxMilestone = {
  id: number
  project: number
  order: number
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

export type FluxDocumentKind = "markdown" | "flowchart" | "database_schema" | "decision"

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

export type FluxEntity = {
  id: number
  project: number
  name: string
  description: string
  created_at: string
  updated_at: string
}

export type FluxFieldType =
  | "string"
  | "text"
  | "int"
  | "bigint"
  | "decimal"
  | "float"
  | "bool"
  | "date"
  | "datetime"
  | "time"
  | "uuid"
  | "json"
  | "email"
  | "url"

export type FluxField = {
  id: number
  entity: number
  name: string
  type: FluxFieldType
  description: string
  nullable: boolean
  unique: boolean
  default: string
  max_length: number | null
  order: number
}

export type FluxRelationKind = "fk" | "m2m" | "o2o"

export type FluxRelationOnDelete = "cascade" | "protect" | "set_null"

export type FluxRelation = {
  id: number
  source: number
  target: number
  kind: FluxRelationKind
  name: string
  related_name: string
  on_delete: FluxRelationOnDelete
  nullable: boolean
  description: string
}

export type FluxScaffoldTarget = "django" | "typescript" | "csharp" | "skeleton" | "design"

export type IdentityThemeModes = "light" | "dark" | "both"
export type IdentityDefaultMode = "system" | "light" | "dark"
export type IdentityColorRole =
  | "primary" | "secondary" | "accent" | "background" | "surface"
  | "text" | "muted" | "border" | "success" | "warning" | "danger"
export type IdentityAssetKind = "logo" | "logo_mark" | "icon" | "favicon" | "illustration" | "other"
export type IdentityAssetMode = "any" | "light" | "dark"

export type IdentityColor = {
  name: string
  role: IdentityColorRole | ""
  light: string
  dark: string
}

export type IdentityAsset = {
  name: string
  kind: IdentityAssetKind
  mode: IdentityAssetMode
  url: string
  usage: string
}

export type FluxIdentity = {
  id: number
  owner: number
  name: string
  description: string
  brand_name: string
  tagline: string
  tone: string
  theme_modes: IdentityThemeModes
  default_mode: IdentityDefaultMode
  colors: IdentityColor[]
  heading_font: string
  body_font: string
  mono_font: string
  font_import_url: string
  font_weights: number[]
  base_font_size: number
  /** DRF decimal, sent as a string such as "1.250". */
  type_scale_ratio: string
  spacing_unit: number
  radii: Record<string, number>
  shadows: Record<string, string>
  shadows_dark: Record<string, string>
  assets: IdentityAsset[]
  logo_rules: string
  icon_library: string
  icon_style: string
  accessibility_target: "AA" | "AAA"
  guidelines: string
  created_at: string
  updated_at: string
}

export type FluxScaffoldFile = { path: string; content: string }

export type FluxStackTarget = "django" | "typescript" | "csharp"

export type FluxStackProfile = {
  id: number
  project: number
  targets: FluxStackTarget[]
  api_naming: "snake_case" | "camel_case"
  auth_method: "session" | "token" | "jwt" | "none"
  database: "postgresql" | "mysql" | "sqlite" | "sqlserver"
  app_label: string
  namespace: string
}

export type FluxOperation = "list" | "retrieve" | "create" | "update" | "delete"

export type FluxResource = {
  id: number
  entity: number
  path: string
  operations: FluxOperation[]
  filters: string[]
  ordering: string
}

export type FluxRole = {
  id: number
  project: number
  name: string
  description: string
}

export type FluxPermissionScope = "all" | "own" | "member"

export type FluxRolePermission = {
  id: number
  role: number
  resource: number
  operation: FluxOperation
  scope: FluxPermissionScope
}

export type FluxScreen = {
  id: number
  project: number
  name: string
  route: string
  description: string
  entities: number[]
  parent: number | null
}

export type FluxIntegrationKind = "api" | "auth" | "storage" | "email" | "payment" | "other"

export type FluxIntegration = {
  id: number
  project: number
  name: string
  kind: FluxIntegrationKind
  description: string
  env_vars: string[]
}

export type FluxSeedRow = {
  id: number
  entity: number
  data: Record<string, unknown>
  order: number
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

export const getFluxEntities = cache(
  (params?: { project?: string }): Promise<FluxEntity[]> =>
    fetchList(FLUX_ENDPOINTS.entities, params)
)

export const getFluxFields = cache(
  (params?: { entity__project?: string; entity?: string }): Promise<FluxField[]> =>
    fetchList(FLUX_ENDPOINTS.fields, params)
)

export const getFluxRelations = cache(
  (params?: { source__project?: string }): Promise<FluxRelation[]> =>
    fetchList(FLUX_ENDPOINTS.relations, params)
)

export const getFluxIdentities = cache(
  (): Promise<FluxIdentity[]> => fetchList(FLUX_ENDPOINTS.identities)
)

export const getFluxStackProfile = cache(
  async (project: string): Promise<FluxStackProfile | null> =>
    (await fetchList<FluxStackProfile>(FLUX_ENDPOINTS.stackProfiles, { project }))[0] ?? null
)

export const getFluxResources = cache(
  (params?: { entity__project?: string }): Promise<FluxResource[]> =>
    fetchList(FLUX_ENDPOINTS.resources, params)
)

export const getFluxRoles = cache(
  (params?: { project?: string }): Promise<FluxRole[]> =>
    fetchList(FLUX_ENDPOINTS.roles, params)
)

export const getFluxRolePermissions = cache(
  (params?: { role__project?: string }): Promise<FluxRolePermission[]> =>
    fetchList(FLUX_ENDPOINTS.rolePermissions, params)
)

export const getFluxScreens = cache(
  (params?: { project?: string }): Promise<FluxScreen[]> =>
    fetchList(FLUX_ENDPOINTS.screens, params)
)

export const getFluxIntegrations = cache(
  (params?: { project?: string }): Promise<FluxIntegration[]> =>
    fetchList(FLUX_ENDPOINTS.integrations, params)
)

export const getFluxSeedRows = cache(
  (params?: { entity__project?: string }): Promise<FluxSeedRow[]> =>
    fetchList(FLUX_ENDPOINTS.seedRows, params)
)

export const getFluxDocuments = cache(
  (params?: { project?: string; milestone?: string; task?: string }): Promise<FluxDocument[]> =>
    fetchList(FLUX_ENDPOINTS.documents, params)
)
