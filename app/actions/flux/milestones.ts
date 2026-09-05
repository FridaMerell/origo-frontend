"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxMilestoneFormSchema, type FluxMilestoneFormValues } from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"

export async function createMilestone(
  projectId: number,
  data: FluxMilestoneFormValues,
  files: string[],
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxMilestoneFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(FLUX_ENDPOINTS.milestones, "POST", {
    project: projectId,
    ...parsed.data,
    files,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function updateMilestone(
  id: number,
  data: FluxMilestoneFormValues,
  files: string[],
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxMilestoneFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.milestones}${id}/`, "PATCH", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function deleteMilestone(id: number, path?: string): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.milestones}${id}/`, "DELETE")
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}
