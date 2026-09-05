"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxProjectFormSchema, type FluxProjectFormValues } from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"

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
