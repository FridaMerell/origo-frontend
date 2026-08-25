"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { getCurrentUser } from "@/app/lib/dal"

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

  if (typeof title !== "string" || !title || typeof content !== "string" || !content) {
    return { error: "Alla fält måste fyllas i." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Du måste vara inloggad." }
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
      venture: venture || null,
      task: task || null,
      author: user.id,
      files,
    }),
  })

  if (!response.ok) {
    return { error: "Uppdateringen kunde inte skapas. Försök igen." }
  }

  revalidatePath("/")

  return { success: true }
}
