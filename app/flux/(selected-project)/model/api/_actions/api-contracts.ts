"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxRequest } from "@/app/flux/_actions/shared"
import type { FluxApiOperation, FluxResource } from "@/app/lib/dal"

const endpoints = {
  resource: FLUX_ENDPOINTS.resources,
  operation: FLUX_ENDPOINTS.apiOperations,
  response: FLUX_ENDPOINTS.apiOperationResponses,
  projection: FLUX_ENDPOINTS.apiProjections,
} as const

export type ApiContractKind = keyof typeof endpoints

export async function saveApiContract({
  kind,
  id,
  payload,
}: {
  kind: ApiContractKind
  id?: number
  payload: Record<string, unknown>
}) {
  const path = id ? `${endpoints[kind]}${id}/` : endpoints[kind]
  const { error } = await fluxRequest(path, id ? "PATCH" : "POST", payload)
  if (error) return { error }

  revalidatePath("/model")
  revalidatePath("/model/api")
  return { success: true }
}

const standardCrud = [
  { key: "list", method: "GET", title: "Lista" },
  { key: "retrieve", method: "GET", title: "Hämta" },
  { key: "create", method: "POST", title: "Skapa" },
  { key: "update", method: "PATCH", title: "Uppdatera" },
  { key: "delete", method: "DELETE", title: "Ta bort" },
] as const

export type CrudGenerationInput = {
  entityId: number
  entityName: string
  resourceId?: number
  resourcePath: string
  existingOperationKeys: string[]
}

function normalizedPath(path: string) {
  return path.trim().replace(/^\/+|\/+$/g, "")
}

export async function generateCrud({
  entityId,
  entityName,
  resourceId,
  resourcePath,
  existingOperationKeys,
}: CrudGenerationInput) {
  const path = normalizedPath(resourcePath)
  if (!path) return { error: "Ange ett API-path för den nya Resourcen." }

  let resolvedResourceId = resourceId
  if (!resolvedResourceId) {
    const { data, error } = await fluxRequest<FluxResource>(FLUX_ENDPOINTS.resources, "POST", {
      entity: entityId,
      path,
    })
    if (error) return { error }
    if (!data) return { error: "Resourcen kunde inte skapas." }
    resolvedResourceId = data.id
  }

  const existing = new Set(existingOperationKeys)
  const detailPath = "/" + path + "/{id}/"
  const collectionPath = "/" + path + "/"
  const createdKeys: string[] = []

  for (const operation of standardCrud) {
    if (existing.has(operation.key)) continue

    const isDetail = operation.key === "retrieve" || operation.key === "update" || operation.key === "delete"
    const { error } = await fluxRequest<FluxApiOperation>(FLUX_ENDPOINTS.apiOperations, "POST", {
      resource: resolvedResourceId,
      key: operation.key,
      method: operation.method,
      path: isDetail ? detailPath : collectionPath,
      title: operation.title + " " + entityName,
      description: operation.title + " " + entityName.toLocaleLowerCase("sv-SE") + " med standard-CRUD.",
      parameters: isDetail ? [{ name: "id", in: "path", type: "integer", required: true }] : [],
      request_schema: null,
      pagination: null,
    })
    if (error) return { error }
    createdKeys.push(operation.key)
  }

  revalidatePath("/model")
  revalidatePath("/model/api")
  revalidatePath("/model/frontend")

  return { success: true, data: { resourceId: resolvedResourceId, createdKeys } }
}

export async function generateAllCrud({ items }: { items: CrudGenerationInput[] }) {
  if (!Array.isArray(items) || items.length > 200) return { error: "CRUD-underlaget är ogiltigt." }
  if (!items.length) return { success: true, data: { createdResources: 0, createdOperations: 0, completedEntities: 0 } }

  const generatedPaths = new Map<string, string>()
  for (const item of items) {
    if (!Number.isInteger(item.entityId) || !item.entityName.trim()) return { error: "En Entity i CRUD-underlaget saknar ett giltigt ID eller namn." }
    if (item.resourceId) continue

    const path = normalizedPath(item.resourcePath)
    if (!path) return { error: "En Resource saknar API-path." }

    const existingOwner = generatedPaths.get(path)
    if (existingOwner) return { error: "Flera Entities får samma föreslagna API-path: " + path + " (" + existingOwner + " och " + item.entityName + ")." }
    generatedPaths.set(path, item.entityName)
  }

  let createdResources = 0
  let createdOperations = 0
  let completedEntities = 0

  for (const item of items) {
    const result = await generateCrud(item)
    if (result.error) {
      return {
        error: "CRUD kunde inte slutföras för " + item.entityName + ": " + result.error,
        data: { createdResources, createdOperations, completedEntities },
      }
    }

    if (!item.resourceId) createdResources += 1
    createdOperations += result.data?.createdKeys.length ?? 0
    completedEntities += 1
  }

  return { success: true, data: { createdResources, createdOperations, completedEntities } }
}
