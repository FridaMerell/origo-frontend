"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import { ventureFormSchema, type VentureFormValues } from "@/app/lib/schemas"

export type CreateVentureState = { error?: string; success?: boolean } | undefined

export async function createVenture(
  data: VentureFormValues,
  path?: string
): Promise<CreateVentureState> {
  const parsed = ventureFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.ventures, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ house, tasks: [], ...parsed.data }),
  })

  if (!response.ok) {
    return { error: "Projektet kunde inte skapas. Försök igen." }
  }

  revalidatePath(path || "/planera")

  return { success: true }
}

export type UpdateVentureFilesState = { error?: string; success?: boolean } | undefined

export async function updateVentureFiles(
  id: string,
  files: string[],
  path?: string
): Promise<UpdateVentureFilesState> {
  if (!id) {
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

  revalidatePath(path || "/planera")

  return { success: true }
}

export type UpdateVentureState = { error?: string; success?: boolean } | undefined

export async function updateVenture(
  id: string,
  data: VentureFormValues,
  files: string[],
  path?: string
): Promise<UpdateVentureState> {
  const parsed = ventureFormSchema.safeParse(data)
  if (!id || !parsed.success) {
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
    body: JSON.stringify({ ...parsed.data, files }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: `Projektet kunde inte uppdateras. Försök igen. (${response.status}: ${detail})` }
  }

  revalidatePath(path || "/planera")

  return { success: true }
}
