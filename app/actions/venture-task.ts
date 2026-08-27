"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { ventureTaskFormSchema, type VentureTaskFormValues } from "@/app/lib/schemas"

export type CreateVentureTaskState = { error?: string; success?: boolean } | undefined

export async function createVentureTask(
  venture: string,
  data: Pick<VentureTaskFormValues, "name" | "description">,
  path?: string
): Promise<CreateVentureTaskState> {
  const parsed = ventureTaskFormSchema
    .pick({ name: true, description: true })
    .safeParse(data)
  if (!venture || !parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.ventureTasks, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ venture, ...parsed.data, completed: false }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: `Uppgiften kunde inte skapas. Försök igen. (${response.status}: ${detail})` }
  }

  revalidatePath(path || "/planera")

  return { success: true }
}

export type UpdateVentureTaskState = { error?: string; success?: boolean } | undefined

export async function updateVentureTask(
  id: string,
  data: VentureTaskFormValues,
  path?: string
): Promise<UpdateVentureTaskState> {
  const parsed = ventureTaskFormSchema.safeParse(data)
  if (!id || !parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.ventureTasks}${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify(parsed.data),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: `Uppgiften kunde inte uppdateras. Försök igen. (${response.status}: ${detail})` }
  }

  revalidatePath(path || "/planera")

  return { success: true }
}

export async function setVentureTaskCompleted(id: string, completed: boolean, path?: string) {
  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.ventureTasks}${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ completed }),
  })

  if (!response.ok) {
    throw new Error("Uppgiften kunde inte uppdateras.")
  }

  revalidatePath(path || "/planera")
}
