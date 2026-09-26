"use server"

import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { firstErrorMessage } from "@/app/lib/api-errors"

export type FluxActionState<T = undefined> = {
  error?: string
  success?: boolean
  data?: T
} | undefined

export async function fluxRequest<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: Record<string, unknown>
): Promise<{ data?: T; error?: string }> {
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

  if (response.ok) {
    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) return {}
    return { data: await response.json() as T }
  }

  const detail = await response.text().catch(() => "")
  return { error: firstErrorMessage(detail, response.status) }
}
