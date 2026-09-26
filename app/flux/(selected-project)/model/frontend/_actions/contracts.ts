"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { getFluxDesign } from "@/app/lib/dal"
import { fluxRequest } from "@/app/flux/_actions/shared"

const endpoints = {
  screen: FLUX_ENDPOINTS.screens,
  role: FLUX_ENDPOINTS.roles,
  permission: FLUX_ENDPOINTS.rolePermissions,
} as const

export type FrontendContractKind = keyof typeof endpoints

type PermissionScope = "all" | "own" | "member"

function revalidateFrontendContracts() {
  revalidatePath("/model")
  revalidatePath("/model/frontend")
  revalidatePath("/model/api")
  revalidatePath("/model/scaffold")
}

export async function saveFrontendContract({
  kind,
  id,
  payload,
}: {
  kind: FrontendContractKind
  id?: number
  payload: Record<string, unknown>
}) {
  const path = id ? endpoints[kind] + id + "/" : endpoints[kind]
  const { data, error } = await fluxRequest<{ id: number }>(path, id ? "PATCH" : "POST", payload)
  if (error) return { error }

  revalidateFrontendContracts()
  return { success: true, data }
}

export async function syncRolePermissions({
  projectId,
  roleId,
  grants,
}: {
  projectId: string
  roleId: number
  grants: { apiOperationId: number; scope: PermissionScope }[]
}) {
  if (!/^\d+$/.test(projectId) || !Number.isInteger(roleId) || !Array.isArray(grants) || grants.length > 500) {
    return { error: "Behörighetsunderlaget är ogiltigt." }
  }

  const scopeValues = new Set<PermissionScope>(["all", "own", "member"])
  const uniqueOperations = new Set<number>()
  for (const grant of grants) {
    if (!Number.isInteger(grant.apiOperationId) || !scopeValues.has(grant.scope) || uniqueOperations.has(grant.apiOperationId)) {
      return { error: "Varje API-operation kan bara ha ett scope per roll." }
    }
    uniqueOperations.add(grant.apiOperationId)
  }

  const design = await getFluxDesign(projectId)
  const role = design?.roles.find((item) => item.id === roleId)
  if (!role) return { error: "Rollen finns inte i det valda projektet." }

  const availableOperations = new Set((design?.api_operations ?? []).map((operation) => operation.id))
  if (grants.some((grant) => !availableOperations.has(grant.apiOperationId))) {
    return { error: "En API-operation i behörighetsmatrisen finns inte i projektet." }
  }

  const currentPermissions = (design?.role_permissions ?? []).filter((permission) => permission.role === roleId)
  const currentByOperation = new Map(currentPermissions.map((permission) => [permission.api_operation, permission]))
  const requestedByOperation = new Map(grants.map((grant) => [grant.apiOperationId, grant]))
  let created = 0
  let updated = 0
  let removed = 0

  for (const permission of currentPermissions) {
    const grant = requestedByOperation.get(permission.api_operation)
    if (!grant) {
      const { error } = await fluxRequest(endpoints.permission + permission.id + "/", "DELETE")
      if (error) {
        revalidateFrontendContracts()
        return { error, data: { created, updated, removed } }
      }
      removed += 1
    } else if (grant.scope !== permission.scope) {
      const { error } = await fluxRequest(endpoints.permission + permission.id + "/", "PATCH", { scope: grant.scope })
      if (error) {
        revalidateFrontendContracts()
        return { error, data: { created, updated, removed } }
      }
      updated += 1
    }
  }

  for (const grant of grants) {
    if (currentByOperation.has(grant.apiOperationId)) continue
    const { error } = await fluxRequest(endpoints.permission, "POST", {
      role: roleId,
      api_operation: grant.apiOperationId,
      scope: grant.scope,
    })
    if (error) {
      revalidateFrontendContracts()
      return { error, data: { created, updated, removed } }
    }
    created += 1
  }

  revalidateFrontendContracts()
  return { success: true, data: { created, updated, removed } }
}
