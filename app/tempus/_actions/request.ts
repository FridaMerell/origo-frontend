import { buildCookieHeader } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

export async function authedJsonHeaders() {
  const { sessionId, csrfToken } = await getSessionCookies()
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken ?? "",
    Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
  }
}

export function firstErrorMessage(detail: string, status: number): string {
  const fallback = `Ett fel uppstod (${status}).`
  try {
    const parsed = JSON.parse(detail)
    const firstKey = Object.keys(parsed)[0]
    const firstValue = firstKey ? parsed[firstKey] : undefined
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") return firstValue[0]
    if (typeof firstValue === "string") return firstValue
    if (typeof parsed?.detail === "string") return parsed.detail
  } catch {
    // Never expose a raw HTML or otherwise unstructured error response.
  }
  return fallback
}
