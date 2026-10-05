"use server"

import { revalidatePath } from "next/cache"
import { APSIS_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { getCurrentUser } from "@/app/lib/dal/auth"
import type { ApsisPlace } from "@/app/lib/dal/apsis"
import { apsisPostFormSchema, type ApsisPostFormValues } from "@/app/lib/schemas"
import { firstErrorMessage } from "@/app/lib/api-errors"

export type ApsisActionState = { error?: string; success?: boolean } | undefined

type ApsisFileInput = { name: string; url: string }

export async function createApsisPost(
  data: ApsisPostFormValues,
  files: ApsisFileInput[]
): Promise<ApsisActionState> {
  const parsed = apsisPostFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Kontrollera fälten och försök igen." }
  }
  if (files.length === 0) {
    return { error: "Välj en bild att ladda upp." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Du måste vara inloggad." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()
  const name = parsed.data.name?.trim() ?? ""

  const response = await fetchOrigoApi(APSIS_ENDPOINTS.posts, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({
      author: user.id,
      name,
      geolocation: parsed.data.geolocation?.trim() ?? "",
      svenska_kyrkan_place_id: parsed.data.svenska_kyrkan_place_id?.trim() ?? "",
      has_apsis: parsed.data.has_apsis,
      // content is required by the API; fall back to the church name or a label.
      content: name || "Absidfoto",
      files,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/apsis")
  revalidatePath("/apsis/slumpa")
  return { success: true }
}

export type ApsisPostUpdate = {
  name: string
  content: string
  has_apsis: boolean
  geolocation: string
  svenska_kyrkan_place_id: string
  // Only sent when the image is replaced.
  files?: ApsisFileInput[]
}

export async function updateApsisPost(id: number, data: ApsisPostUpdate): Promise<ApsisActionState> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return { error: "Du måste vara inloggad." }

  const name = data.name.trim()
  const response = await fetchOrigoApi(`${APSIS_ENDPOINTS.posts}${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({
      name,
      // content is required by the API; fall back to the church name or a label.
      content: data.content.trim() || name || "Absidfoto",
      has_apsis: data.has_apsis,
      geolocation: data.geolocation.trim(),
      svenska_kyrkan_place_id: data.svenska_kyrkan_place_id.trim(),
      ...(data.files?.length ? { files: data.files } : {}),
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/apsis")
  revalidatePath("/apsis/slumpa")
  return { success: true }
}

export async function deleteApsisPost(id: number): Promise<ApsisActionState> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(`${APSIS_ENDPOINTS.posts}${id}/`, {
    method: "DELETE",
    headers: {
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/apsis")
  revalidatePath("/apsis/slumpa")
  return { success: true }
}

export async function searchApsisPlaces(query: string): Promise<{ hits: ApsisPlace[]; error?: string }> {
  const q = query.trim()
  if (q.length < 2) return { hits: [] }
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return { hits: [], error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(`${APSIS_ENDPOINTS.places}?${new URLSearchParams({ q })}`, {
    headers: { Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }) },
  })
  if (!response.ok) return { hits: [], error: `Sökningen misslyckades (${response.status}).` }
  const raw: unknown = await response.json().catch(() => [])
  return { hits: Array.isArray(raw) ? (raw as ApsisPlace[]) : [] }
}

/** The places behind a list of posts, keyed by place ID, in one request. */
export async function getApsisPlaceSummaries(ids: string[]): Promise<Record<string, ApsisPlace>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return {}
  const response = await fetchOrigoApi(`${APSIS_ENDPOINTS.placeSummaries}?${new URLSearchParams({ ids: unique.join(",") })}`)
  if (!response.ok) return {}
  return response.json().catch(() => ({}))
}

// Public, like the posts themselves: no session is needed to read a connected church.
export async function getApsisPlace(id: string): Promise<ApsisPlace | null> {
  const response = await fetchOrigoApi(APSIS_ENDPOINTS.place(id))
  if (!response.ok) return null
  return response.json().catch(() => null)
}
