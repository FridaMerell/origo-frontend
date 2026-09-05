"use server"

import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxUpdateFormSchema, type FluxUpdateFormValues } from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"
import type { FluxUpdate } from "@/app/lib/dal"

export async function createUpdate(
  projectId: number,
  milestoneId: number | null,
  taskId: number | null,
  data: FluxUpdateFormValues,
  files: string[]
): Promise<FluxActionState<FluxUpdate>> {
  const parsed = fluxUpdateFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { data: update, error } = await fluxRequest<FluxUpdate>(FLUX_ENDPOINTS.updates, "POST", {
    project: projectId,
    milestone: milestoneId,
    task: taskId,
    ...parsed.data,
    files,
  })
  if (error) return { error }

  return update ? { success: true, data: update } : { error: "Uppdateringen kunde inte läsas tillbaka." }
}

export async function updateUpdate(
  id: number,
  data: FluxUpdateFormValues,
  files: string[]
): Promise<FluxActionState<FluxUpdate>> {
  const parsed = fluxUpdateFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { data: update, error } = await fluxRequest<FluxUpdate>(`${FLUX_ENDPOINTS.updates}${id}/`, "PATCH", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  return update ? { success: true, data: update } : { error: "Uppdateringen kunde inte läsas tillbaka." }
}

export async function deleteUpdate(id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.updates}${id}/`, "DELETE")
  if (error) return { error }

  return { success: true }
}
