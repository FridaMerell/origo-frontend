"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxDocumentFormSchema, type FluxDocumentFormValues } from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"

export async function createDocument(
  projectId: number,
  data: FluxDocumentFormValues,
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxDocumentFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Kontrollera dokumentets uppgifter." }

  if (parsed.data.milestone && parsed.data.task) {
    return { error: "Välj antingen en milstolpe eller en uppgift." }
  }

  const { error } = await fluxRequest(FLUX_ENDPOINTS.documents, "POST", {
    project: projectId,
    ...parsed.data,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}

export async function updateDocument(
  id: number,
  projectId: number,
  data: FluxDocumentFormValues,
  path?: string
): Promise<FluxActionState> {
  const parsed = fluxDocumentFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Kontrollera dokumentets uppgifter." }

  if (parsed.data.milestone && parsed.data.task) {
    return { error: "Välj antingen en milstolpe eller en uppgift." }
  }

  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.documents}${id}/`, "PATCH", {
    project: projectId,
    ...parsed.data,
  })
  if (error) return { error }

  revalidatePath(path || "/flux")
  return { success: true }
}
