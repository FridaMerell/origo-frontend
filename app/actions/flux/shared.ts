"use server"

import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { firstErrorMessage } from "@/app/lib/api-errors"

export type FluxActionState = { error?: string; success?: boolean } | undefined

export async function fluxRequest(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: Record<string, unknown>
): Promise<{ error?: string }> {
  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.ok) return {}

  const detail = await response.text().catch(() => "")
  return { error: firstErrorMessage(detail, response.status) }
}
