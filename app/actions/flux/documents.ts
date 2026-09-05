"use server"

import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxDocumentFormSchema, type FluxDocumentFormValues } from "@/app/lib/schemas"
import { fluxRequest, type FluxActionState } from "./shared"
import type { FluxDocument } from "@/app/lib/dal"

export async function createDocument(
  projectId: number,
  data: FluxDocumentFormValues,
): Promise<FluxActionState<FluxDocument>> {
  const parsed = fluxDocumentFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Kontrollera dokumentets uppgifter." }

  if (parsed.data.milestone && parsed.data.task) {
    return { error: "Välj antingen en milstolpe eller en uppgift." }
  }

  const { data: document, error } = await fluxRequest<FluxDocument>(FLUX_ENDPOINTS.documents, "POST", {
    project: projectId,
    ...parsed.data,
  })
  if (error) return { error }

  return document ? { success: true, data: document } : { error: "Dokumentet kunde inte läsas tillbaka." }
}

export async function updateDocument(
  id: number,
  projectId: number,
  data: FluxDocumentFormValues,
): Promise<FluxActionState<FluxDocument>> {
  const parsed = fluxDocumentFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Kontrollera dokumentets uppgifter." }

  if (parsed.data.milestone && parsed.data.task) {
    return { error: "Välj antingen en milstolpe eller en uppgift." }
  }

  const { data: document, error } = await fluxRequest<FluxDocument>(`${FLUX_ENDPOINTS.documents}${id}/`, "PATCH", {
    project: projectId,
    ...parsed.data,
  })
  if (error) return { error }

  return document ? { success: true, data: document } : { error: "Dokumentet kunde inte läsas tillbaka." }
}
