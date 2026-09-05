"use server"

import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxMilestoneFormSchema, type FluxMilestoneFormValues } from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"
import type { FluxMilestone } from "@/app/lib/dal"

export async function createMilestone(
  projectId: number,
  data: FluxMilestoneFormValues,
  files: string[],
): Promise<FluxActionState<FluxMilestone>> {
  const parsed = fluxMilestoneFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { data: milestone, error } = await fluxRequest<FluxMilestone>(FLUX_ENDPOINTS.milestones, "POST", {
    project: projectId,
    ...parsed.data,
    files,
  })
  if (error) return { error }

  if (!milestone) return { error: "Delmålet skapades, men kunde inte läsas tillbaka." }
  return { success: true, data: milestone }
}

export async function updateMilestone(
  id: number,
  data: FluxMilestoneFormValues,
  files: string[],
): Promise<FluxActionState<FluxMilestone>> {
  const parsed = fluxMilestoneFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { data: milestone, error } = await fluxRequest<FluxMilestone>(`${FLUX_ENDPOINTS.milestones}${id}/`, "PATCH", {
    ...parsed.data,
    files,
  })
  if (error) return { error }

  if (!milestone) return { error: "Delmålet sparades, men kunde inte läsas tillbaka." }
  return { success: true, data: milestone }
}

export async function deleteMilestone(id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.milestones}${id}/`, "DELETE")
  if (error) return { error }

  return { success: true }
}
