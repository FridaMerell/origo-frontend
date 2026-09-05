"use server"

import { revalidatePath } from "next/cache"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { getCurrentUser } from "@/app/lib/dal"
import { observationFormSchema, type ObservationFormValues } from "@/app/lib/schemas"
import { authedJsonHeaders, firstErrorMessage } from "./request"

export type ObservationResult = {
  success?: boolean
  observationId?: string
  error?: string
}

export async function createObservation(input: ObservationFormValues): Promise<ObservationResult> {
  const parsed = observationFormSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.observations, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(parsed.data),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  const created = (await response.json().catch(() => null)) as { id?: unknown } | null
  revalidatePath("/observationer")
  return { success: true, observationId: typeof created?.id === "string" ? created.id : undefined }
}

export type ObservationBatchResult = {
  results: Array<{ index: number; species: string; ok: boolean; observationId?: string; error?: string }>
  created: number
  error?: string
}

export async function createObservationsBatch(
  inputs: ObservationFormValues[],
): Promise<ObservationBatchResult> {
  if (inputs.length === 0) return { results: [], created: 0, error: "Lägg till minst en observation." }
  if (!(await getCurrentUser())) return { results: [], created: 0, error: "Du måste vara inloggad." }

  const headers = await authedJsonHeaders()
  const results: ObservationBatchResult["results"] = []
  await Promise.all(inputs.map(async (input, index) => {
    const parsed = observationFormSchema.safeParse(input)
    if (!parsed.success) {
      results[index] = { index, species: input.species, ok: false, error: parsed.error.issues[0]?.message ?? "Ogiltig observation." }
      return
    }
    const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.observations, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed.data),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      results[index] = { index, species: parsed.data.species, ok: false, error: firstErrorMessage(detail, response.status) }
      return
    }
    const created = (await response.json().catch(() => null)) as { id?: unknown } | null
    results[index] = { index, species: parsed.data.species, ok: true, observationId: typeof created?.id === "string" ? created.id : undefined }
  }))

  const ordered = results.filter(Boolean)
  const created = ordered.filter((result) => result.ok).length
  if (created > 0) revalidatePath("/observationer")
  return { results: ordered, created }
}

export async function updateObservation(
  id: string,
  input: Partial<ObservationFormValues>,
): Promise<ObservationResult> {
  const parsed = observationFormSchema.partial().safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.observations}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(parsed.data),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  revalidatePath("/observationer")
  return { success: true, observationId: id }
}

export async function deleteObservation(id: string): Promise<ObservationResult> {
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.observations}${id}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  revalidatePath("/observationer")
  return { success: true }
}
