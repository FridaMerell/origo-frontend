"use server"

import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { firstErrorMessage } from "@/app/lib/api-errors"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { getSessionCookies } from "@/app/lib/session"
import {
  fluxIntegrationFormSchema,
  fluxResourceFormSchema,
  fluxRoleFormSchema,
  fluxScreenFormSchema,
  fluxSeedRowFormSchema,
  fluxStackFormSchema,
  type FluxIntegrationFormValues,
  type FluxResourceFormValues,
  type FluxRoleFormValues,
  type FluxScreenFormValues,
  type FluxSeedRowFormValues,
  type FluxStackFormValues,
} from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"
import type {
  FluxDocument,
  FluxIntegration,
  FluxOperation,
  FluxPermissionScope,
  FluxResource,
  FluxRole,
  FluxRolePermission,
  FluxScaffoldFile,
  FluxScaffoldTarget,
  FluxScreen,
  FluxSeedRow,
  FluxStackProfile,
} from "@/app/lib/dal"

const INVALID = "Alla fält måste fyllas i."

async function save<T>(
  endpoint: string,
  id: number | null,
  body: Record<string, unknown>,
  label: string,
): Promise<FluxActionState<T>> {
  const { data, error } = await fluxRequest<T>(id ? `${endpoint}${id}/` : endpoint, id ? "PATCH" : "POST", body)
  if (error) return { error }
  if (!data) return { error: `${label} sparades, men kunde inte läsas tillbaka.` }
  return { success: true, data }
}

async function remove(endpoint: string, id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${endpoint}${id}/`, "DELETE")
  return error ? { error } : { success: true }
}

export async function saveStackProfile(
  projectId: number,
  id: number | null,
  values: FluxStackFormValues,
): Promise<FluxActionState<FluxStackProfile>> {
  const parsed = fluxStackFormSchema.safeParse(values)
  if (!parsed.success) return { error: INVALID }
  return save(FLUX_ENDPOINTS.stackProfiles, id, { project: projectId, ...parsed.data }, "Stack-profilen")
}

export async function saveResource(
  id: number | null,
  values: FluxResourceFormValues,
): Promise<FluxActionState<FluxResource>> {
  const parsed = fluxResourceFormSchema.safeParse(values)
  if (!parsed.success) return { error: INVALID }
  return save(FLUX_ENDPOINTS.resources, id, parsed.data, "Resursen")
}

export async function deleteResource(id: number): Promise<FluxActionState> {
  return remove(FLUX_ENDPOINTS.resources, id)
}

export async function saveRole(
  projectId: number,
  id: number | null,
  values: FluxRoleFormValues,
): Promise<FluxActionState<FluxRole>> {
  const parsed = fluxRoleFormSchema.safeParse(values)
  if (!parsed.success) return { error: INVALID }
  return save(FLUX_ENDPOINTS.roles, id, { project: projectId, ...parsed.data }, "Rollen")
}

export async function deleteRole(id: number): Promise<FluxActionState> {
  return remove(FLUX_ENDPOINTS.roles, id)
}

/** Create, change or clear (scope null) one cell of the permission matrix. */
export async function setRolePermission(
  role: number,
  resource: number,
  operation: FluxOperation,
  existingId: number | null,
  scope: FluxPermissionScope | null,
): Promise<FluxActionState<FluxRolePermission | null>> {
  if (scope === null) {
    if (!existingId) return { success: true, data: null }
    const result = await remove(FLUX_ENDPOINTS.rolePermissions, existingId)
    return result?.error ? { error: result.error } : { success: true, data: null }
  }
  return save<FluxRolePermission | null>(
    FLUX_ENDPOINTS.rolePermissions,
    existingId,
    existingId ? { scope } : { role, resource, operation, scope },
    "Behörigheten",
  )
}

export async function saveScreen(
  projectId: number,
  id: number | null,
  values: FluxScreenFormValues,
): Promise<FluxActionState<FluxScreen>> {
  const parsed = fluxScreenFormSchema.safeParse(values)
  if (!parsed.success) return { error: INVALID }
  return save(FLUX_ENDPOINTS.screens, id, { project: projectId, ...parsed.data }, "Skärmen")
}

export async function deleteScreen(id: number): Promise<FluxActionState> {
  return remove(FLUX_ENDPOINTS.screens, id)
}

export async function saveIntegration(
  projectId: number,
  id: number | null,
  values: FluxIntegrationFormValues,
): Promise<FluxActionState<FluxIntegration>> {
  const parsed = fluxIntegrationFormSchema.safeParse(values)
  if (!parsed.success) return { error: INVALID }
  const env_vars = parsed.data.env_vars.split("\n").map((line) => line.trim()).filter(Boolean)
  return save(FLUX_ENDPOINTS.integrations, id, { project: projectId, ...parsed.data, env_vars }, "Integrationen")
}

export async function deleteIntegration(id: number): Promise<FluxActionState> {
  return remove(FLUX_ENDPOINTS.integrations, id)
}

export async function saveSeedRow(
  id: number | null,
  order: number,
  values: FluxSeedRowFormValues,
): Promise<FluxActionState<FluxSeedRow>> {
  const parsed = fluxSeedRowFormSchema.safeParse(values)
  if (!parsed.success) return { error: INVALID }
  const body = { entity: parsed.data.entity, data: JSON.parse(parsed.data.data) as Record<string, unknown> }
  return save(FLUX_ENDPOINTS.seedRows, id, id ? body : { ...body, order }, "Raden")
}

export async function deleteSeedRow(id: number): Promise<FluxActionState> {
  return remove(FLUX_ENDPOINTS.seedRows, id)
}

export async function getScaffold(
  projectId: number,
  target: FluxScaffoldTarget,
): Promise<FluxActionState<FluxScaffoldFile[]>> {
  const { sessionId, csrfToken } = await getSessionCookies()
  const response = await fetchOrigoApi(`${FLUX_ENDPOINTS.projectScaffold(projectId)}?target=${encodeURIComponent(target)}`, {
    headers: { Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }) },
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  const payload = (await response.json()) as { files?: FluxScaffoldFile[] }
  return { success: true, data: payload.files ?? [] }
}

export async function saveScaffoldDocument(
  projectId: number,
  target: FluxScaffoldTarget,
): Promise<FluxActionState<FluxDocument>> {
  return save(FLUX_ENDPOINTS.projectScaffoldDocument(projectId), null, { target }, "Dokumentet")
}

export async function generateProjectTasks(
  projectId: number,
): Promise<FluxActionState<{ created: { id: number; title: string; milestone: number | null }[] }>> {
  return save(FLUX_ENDPOINTS.projectGenerateTasks(projectId), null, {}, "Uppgifterna")
}
