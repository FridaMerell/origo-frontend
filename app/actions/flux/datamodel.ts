"use server"

import { FLUX_ENDPOINTS } from "@/app/lib/config"
import {
  fluxEntityFormSchema,
  fluxFieldFormSchema,
  fluxRelationFormSchema,
  type FluxEntityFormValues,
  type FluxFieldFormValues,
  type FluxRelationFormValues,
} from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"
import type { FluxEntity, FluxField, FluxRelation } from "@/app/lib/dal"

export async function createEntity(
  projectId: number,
  data: FluxEntityFormValues,
): Promise<FluxActionState<FluxEntity>> {
  const parsed = fluxEntityFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Alla fält måste fyllas i." }

  const { data: entity, error } = await fluxRequest<FluxEntity>(FLUX_ENDPOINTS.entities, "POST", {
    project: projectId,
    ...parsed.data,
  })
  if (error) return { error }
  if (!entity) return { error: "Entiteten skapades, men kunde inte läsas tillbaka." }
  return { success: true, data: entity }
}

export async function updateEntity(
  id: number,
  data: FluxEntityFormValues,
): Promise<FluxActionState<FluxEntity>> {
  const parsed = fluxEntityFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Alla fält måste fyllas i." }

  const { data: entity, error } = await fluxRequest<FluxEntity>(`${FLUX_ENDPOINTS.entities}${id}/`, "PATCH", parsed.data)
  if (error) return { error }
  if (!entity) return { error: "Entiteten sparades, men kunde inte läsas tillbaka." }
  return { success: true, data: entity }
}

export async function deleteEntity(id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.entities}${id}/`, "DELETE")
  if (error) return { error }
  return { success: true }
}

export async function createField(
  entityId: number,
  order: number,
  data: FluxFieldFormValues,
): Promise<FluxActionState<FluxField>> {
  const parsed = fluxFieldFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Alla fält måste fyllas i." }

  const { data: field, error } = await fluxRequest<FluxField>(FLUX_ENDPOINTS.fields, "POST", {
    entity: entityId,
    order,
    ...parsed.data,
  })
  if (error) return { error }
  if (!field) return { error: "Fältet skapades, men kunde inte läsas tillbaka." }
  return { success: true, data: field }
}

export async function updateField(
  id: number,
  data: FluxFieldFormValues,
): Promise<FluxActionState<FluxField>> {
  const parsed = fluxFieldFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Alla fält måste fyllas i." }

  const { data: field, error } = await fluxRequest<FluxField>(`${FLUX_ENDPOINTS.fields}${id}/`, "PATCH", parsed.data)
  if (error) return { error }
  if (!field) return { error: "Fältet sparades, men kunde inte läsas tillbaka." }
  return { success: true, data: field }
}

export async function deleteField(id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.fields}${id}/`, "DELETE")
  if (error) return { error }
  return { success: true }
}

export async function createRelation(
  data: FluxRelationFormValues,
): Promise<FluxActionState<FluxRelation>> {
  const parsed = fluxRelationFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Alla fält måste fyllas i." }

  const { data: relation, error } = await fluxRequest<FluxRelation>(FLUX_ENDPOINTS.relations, "POST", parsed.data)
  if (error) return { error }
  if (!relation) return { error: "Relationen skapades, men kunde inte läsas tillbaka." }
  return { success: true, data: relation }
}

export async function updateRelation(
  id: number,
  data: FluxRelationFormValues,
): Promise<FluxActionState<FluxRelation>> {
  const parsed = fluxRelationFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Alla fält måste fyllas i." }

  const { data: relation, error } = await fluxRequest<FluxRelation>(`${FLUX_ENDPOINTS.relations}${id}/`, "PATCH", parsed.data)
  if (error) return { error }
  if (!relation) return { error: "Relationen sparades, men kunde inte läsas tillbaka." }
  return { success: true, data: relation }
}

export async function deleteRelation(id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.relations}${id}/`, "DELETE")
  if (error) return { error }
  return { success: true }
}
