"use server"

import { revalidatePath } from "next/cache"
import { FACILITY_COOKIE, VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { cookies } from "next/headers"

export type CreateVentureState = { error?: string; success?: boolean } | undefined

export async function createVenture(
  _prevState: CreateVentureState,
  formData: FormData
): Promise<CreateVentureState> {
  const cookieStore = await cookies()
  const house = cookieStore.get(FACILITY_COOKIE)?.value
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
