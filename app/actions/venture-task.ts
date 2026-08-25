"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

export type CreateVentureTaskState = { error?: string; success?: boolean } | undefined

export async function createVentureTask(
  _prevState: CreateVentureTaskState,
  formData: FormData
): Promise<CreateVentureTaskState> {
  const venture = formData.get("venture")
  const name = formData.get("name")
  const description = formData.get("description")

  if (
    typeof venture !== "string" || !venture ||
    typeof name !== "string" || !name ||
    typeof description !== "string" || !description
  ) {
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
    body: JSON.stringify({ venture, name, description, completed: false }),
  })

  if (!response.ok) {
    return { error: "Uppgiften kunde inte skapas. Försök igen." }
  }

  revalidatePath("/planera")

  return { success: true }
}

export type UpdateVentureTaskState = { error?: string; success?: boolean } | undefined

export async function updateVentureTask(
  _prevState: UpdateVentureTaskState,
  formData: FormData
): Promise<UpdateVentureTaskState> {
  const id = formData.get("id")
  const name = formData.get("name")
  const description = formData.get("description")
  const completed = formData.get("completed") === "on"

  if (
    typeof id !== "string" || !id ||
    typeof name !== "string" || !name ||
    typeof description !== "string" || !description
  ) {
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
    body: JSON.stringify({ name, description, completed }),
  })

  if (!response.ok) {
    return { error: "Uppgiften kunde inte uppdateras. Försök igen." }
  }

  revalidatePath("/planera")

  return { success: true }
}

export async function setVentureTaskCompleted(id: string, completed: boolean) {
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

  revalidatePath("/planera")
}
