"use server"

import { fetchOrigoApi } from "@/app/lib/api-client"
import { responseErrorMessage } from "@/app/lib/api-errors"
import { authedJsonHeaders } from "@/app/lib/auth-headers"

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
  const response = await fetchOrigoApi(path, {
    method,
    headers: await authedJsonHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.ok) {
    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) return {}
    return { data: await response.json() as T }
  }

  return { error: await responseErrorMessage(response) }
}
