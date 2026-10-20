"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { getCurrentUser } from "@/app/lib/dal/auth"
import {
  getTempusCategoryObservationsPage,
  getTempusObservationCategoryPage,
  type TempusCategoryObservationsPage,
  type TempusObservationCategoryPage,
} from "@/app/lib/dal/tempus/observations"
import { observationFormSchema, type ObservationFormValues } from "@/app/lib/schemas"
import { authedJsonHeaders, responseErrorMessage } from "./request"

export type ObservationResult = {
  success?: boolean
  observationId?: string
  error?: string
}

export async function loadLocaleObservationCategories(
  localeId: number,
  page = 1,
  pageSize = 25,
): Promise<TempusObservationCategoryPage> {
  return getTempusObservationCategoryPage(localeId, { page, page_size: pageSize })
}

export async function loadLocaleCategoryObservations(
  localeId: number,
  categoryId: string,
  page = 1,
  pageSize = 8,
): Promise<TempusCategoryObservationsPage> {
  return getTempusCategoryObservationsPage(categoryId, localeId, { page, page_size: pageSize })
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
    return { error: await responseErrorMessage(response) }
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
      results[index] = { index, species: parsed.data.species, ok: false, error: await responseErrorMessage(response) }
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

  // partial() still fills in the schema's defaults (count: null, notes: "", ...);
  // send only the fields the caller passed so a PATCH never blanks the others.
  const changes = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => key in input))
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.observations}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(changes),
  })
  if (!response.ok) {
    return { error: await responseErrorMessage(response) }
  }
  revalidatePath("/observationer")
  return { success: true, observationId: id }
}

const observationPhotosSchema = z.array(z.string().url())

/** Replaces the observation's photo paths (see /api/upload) and nothing else. */
export async function setObservationPhotos(id: string, photos: string[]): Promise<ObservationResult> {
  const parsed = observationPhotosSchema.safeParse(photos)
  if (!parsed.success) return { error: "Bildernas sökvägar är ogiltiga." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.observations}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ photos: parsed.data }),
  })
  if (!response.ok) {
    return { error: await responseErrorMessage(response) }
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
    return { error: await responseErrorMessage(response) }
  }
  revalidatePath("/observationer")
  return { success: true }
}
