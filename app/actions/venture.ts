"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"

export type CreateVentureState = { error?: string; success?: boolean } | undefined

export async function createVenture(
  _prevState: CreateVentureState,
  formData: FormData
): Promise<CreateVentureState> {
  const house = await resolveSelectedHouse()
  const name = formData.get("name")
  const description = formData.get("description")
  const priority = formData.get("priority")
  const budget = formData.get("budget")

  if (
    typeof house !== "string" || !house ||
    typeof name !== "string" || !name ||
    typeof description !== "string" || !description ||
    typeof priority !== "string" || !priority ||
    typeof budget !== "string" || !budget
  ) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.ventures, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ house, name, description, priority, budget }),
  })

  if (!response.ok) {
    return { error: "Projektet kunde inte skapas. Försök igen." }
  }

  revalidatePath("/planera")

  return { success: true }
}

export type UpdateVentureFilesState = { error?: string; success?: boolean } | undefined

export async function updateVentureFiles(
  _prevState: UpdateVentureFilesState,
  formData: FormData
): Promise<UpdateVentureFilesState> {
  const id = formData.get("id")
  const files = formData.getAll("files").filter((f): f is string => typeof f === "string")

  if (typeof id !== "string" || !id) {
    return { error: "Projektet kunde inte hittas." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.ventures}${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ files }),
  })

  if (!response.ok) {
    return { error: "Filerna kunde inte sparas. Försök igen." }
  }

  revalidatePath("/planera")

  return { success: true }
}

export type UpdateVentureState = { error?: string; success?: boolean } | undefined

export async function updateVenture(
  _prevState: UpdateVentureState,
  formData: FormData
): Promise<UpdateVentureState> {
  const id = formData.get("id")
  const name = formData.get("name")
  const description = formData.get("description")
  const priority = formData.get("priority")
  const budget = formData.get("budget")
  const files = formData.getAll("files").filter((f): f is string => typeof f === "string")

  if (
    typeof id !== "string" || !id ||
    typeof name !== "string" || !name ||
    typeof description !== "string" || !description ||
    typeof priority !== "string" || !priority ||
    typeof budget !== "string" || !budget
  ) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.ventures}${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ name, description, priority, budget, files }),
  })

  if (!response.ok) {
    return { error: "Projektet kunde inte uppdateras. Försök igen." }
  }

  revalidatePath("/planera")

  return { success: true }
}
