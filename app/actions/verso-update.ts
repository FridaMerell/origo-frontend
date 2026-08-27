"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { getCurrentUser } from "@/app/lib/dal"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import { versoUpdateFormSchema, type VersoUpdateFormValues } from "@/app/lib/schemas"

export type CreateVersoUpdateState = { error?: string; success?: boolean } | undefined

export async function createVersoUpdate(
  data: VersoUpdateFormValues,
  files: string[],
  path?: string
): Promise<CreateVersoUpdateState> {
  const parsed = versoUpdateFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Du måste vara inloggad." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.versoUpdates, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({
      title: parsed.data.title,
      content: parsed.data.content,
      house,
      venture: parsed.data.venture || null,
      task: parsed.data.task || null,
      author: user.id,
      files,
    }),
  })

  if (!response.ok) {
    return { error: "Uppdateringen kunde inte skapas. Försök igen." }
  }

  revalidatePath(path || "/")

  return { success: true }
}

export type UpdateVersoUpdateState = { error?: string; success?: boolean } | undefined

export async function updateVersoUpdate(
  id: string,
  data: VersoUpdateFormValues,
  files: string[],
  path?: string
): Promise<UpdateVersoUpdateState> {
  const parsed = versoUpdateFormSchema.safeParse(data)
  if (!id) {
    return { error: "Uppdateringen kunde inte hittas." }
  }
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.versoUpdates}${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({
      title: parsed.data.title,
      content: parsed.data.content,
      venture: parsed.data.venture || null,
      task: parsed.data.task || null,
      files,
    }),
  })

  if (!response.ok) {
    return { error: "Uppdateringen kunde inte sparas. Försök igen." }
  }

  revalidatePath(path || "/")

  return { success: true }
}
