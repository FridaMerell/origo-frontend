"use server"

import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxProjectFormSchema, type FluxProjectFormValues } from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"
import type { FluxProject } from "@/app/lib/dal"

export async function createProject(
  data: FluxProjectFormValues,
  files: string[],
): Promise<FluxActionState<FluxProject>> {
  const parsed = fluxProjectFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { data: project, error } = await fluxRequest<FluxProject>(FLUX_ENDPOINTS.projects, "POST", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  return project ? { success: true, data: project } : { error: "Projektet kunde inte läsas tillbaka." }
}

export async function updateProject(
  id: number,
  data: FluxProjectFormValues,
  files: string[],
): Promise<FluxActionState<FluxProject>> {
  const parsed = fluxProjectFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { data: project, error } = await fluxRequest<FluxProject>(`${FLUX_ENDPOINTS.projects}${id}/`, "PATCH", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  return project ? { success: true, data: project } : { error: "Projektet kunde inte läsas tillbaka." }
}

export async function deleteProject(id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.projects}${id}/`, "DELETE")
  if (error) return { error }

  return { success: true }
}
