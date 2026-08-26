"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { getCurrentUser } from "@/app/lib/dal"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"

export type CreateVersoUpdateState = { error?: string; success?: boolean } | undefined

export async function createVersoUpdate(
  _prevState: CreateVersoUpdateState,
  formData: FormData
): Promise<CreateVersoUpdateState> {
  const title = formData.get("title")
  const content = formData.get("content")
  const venture = formData.get("venture")
  const task = formData.get("task")
  const files = formData.getAll("files").filter((f): f is string => typeof f === "string")
  const path = formData.get("path")

  if (typeof title !== "string" || !title || typeof content !== "string" || !content) {
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
      title,
      content,
      house,
      venture: venture || null,
      task: task || null,
      author: user.id,
      files,
    }),
  })

  if (!response.ok) {
    return { error: "Uppdateringen kunde inte skapas. Försök igen." }
  }

  revalidatePath(typeof path === "string" && path ? path : "/")

  return { success: true }
}

export type UpdateVersoUpdateState = { error?: string; success?: boolean } | undefined

export async function updateVersoUpdate(
  _prevState: UpdateVersoUpdateState,
  formData: FormData
): Promise<UpdateVersoUpdateState> {
  const id = formData.get("id")
  const title = formData.get("title")
  const content = formData.get("content")
  const venture = formData.get("venture")
  const task = formData.get("task")
  const files = formData.getAll("files").filter((f): f is string => typeof f === "string")
  const path = formData.get("path")

  if (typeof id !== "string" || !id) {
    return { error: "Uppdateringen kunde inte hittas." }
  }

  if (typeof title !== "string" || !title || typeof content !== "string" || !content) {
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
      title,
      content,
      venture: venture || null,
      task: task || null,
      files,
    }),
  })

  if (!response.ok) {
    return { error: "Uppdateringen kunde inte sparas. Försök igen." }
  }

  revalidatePath(typeof path === "string" && path ? path : "/")

  return { success: true }
}
