"use server"

import { revalidatePath } from "next/cache"
import { APSIS_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { getCurrentUser } from "@/app/lib/dal"
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
