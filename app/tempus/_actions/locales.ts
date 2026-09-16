"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { getCurrentUser } from "@/app/lib/dal"
import type { TempusLocale } from "@/app/lib/dal"
import { authedJsonHeaders, firstErrorMessage } from "./request"

const positionSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
])

const localeGeometrySchema = z.object({
  type: z.literal("MultiPolygon"),
  coordinates: z.array(z.array(z.array(positionSchema).min(4)).min(1)).min(1),
})

const localeIdSchema = z.coerce.number().int().positive()

export type CreateLocaleInput = {
  name: string
  geometry: TempusLocale["geometry"]
}

export async function createLocale(input: CreateLocaleInput): Promise<{ success?: boolean; error?: string }> {
  const name = input.name.trim()
  if (!name) return { error: "Ange ett namn för platsen." }
  const geometry = localeGeometrySchema.safeParse(input.geometry)
  if (!geometry.success) return { error: "Rita en plats med minst tre punkter." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.locales, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ name, geometry: geometry.data }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/lokaler")
  revalidatePath("/checklistor/ny")
  return { success: true }
}

export async function updateLocale(id: string | number, input: CreateLocaleInput): Promise<{ success?: boolean; error?: string }> {
  const localeId = localeIdSchema.safeParse(id)
  if (!localeId.success) return { error: "Platsen har ett ogiltigt ID." }
  const name = input.name.trim()
  if (!name) return { error: "Ange ett namn för platsen." }
  const geometry = localeGeometrySchema.safeParse(input.geometry)
  if (!geometry.success) return { error: "Rita en plats med minst tre punkter." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.locales}${localeId.data}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ name, geometry: geometry.data }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/lokaler")
  revalidatePath(`/lokaler/${localeId.data}/redigera`)
  revalidatePath("/checklistor")
  revalidatePath("/observationer")
  return { success: true }
}

export async function deleteLocale(id: string | number): Promise<{ success?: boolean; error?: string }> {
  const localeId = localeIdSchema.safeParse(id)
  if (!localeId.success) return { error: "Platsen har ett ogiltigt ID." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.locales}${localeId.data}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/lokaler")
  revalidatePath("/checklistor")
  revalidatePath("/checklistor/ny")
  revalidatePath("/observationer")
  return { success: true }
}
