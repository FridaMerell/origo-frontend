"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxRequest } from "@/app/flux/_actions/shared"

type GeneratedTask = { id: number; title: string; milestone: number | null }

export async function generateImplementationPlan(projectId: string) {
  const { data, error } = await fluxRequest<{ created: GeneratedTask[] }>(
    FLUX_ENDPOINTS.projectGenerateTasks(projectId),
    "POST",
  )
  if (error) return { error }

  revalidatePath("/model")
  revalidatePath("/tasks")
  revalidatePath("/projects/" + projectId)

  return { success: true, data: { createdCount: data?.created.length ?? 0 } }
}
