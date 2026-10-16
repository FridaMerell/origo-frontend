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

/** Läser felsvaret från API:t och returnerar ett läsbart felmeddelande. */
export async function responseErrorMessage(response: Response): Promise<string> {
  const detail = await response.text().catch(() => "")
  return firstErrorMessage(detail, response.status)
}

const GENERAL_ERROR_KEYS = new Set(["detail", "non_field_errors"])

/** Går ner i ett DRF-felsvar och returnerar första meddelandet med sökvägen till fältet, t.ex. "checklist_items.0". */
function firstFieldError(value: unknown, path: string[] = []): { path: string[]; message: string } | null {
  if (typeof value === "string") return { path, message: value }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = firstFieldError(item, typeof item === "string" ? path : [...path, String(index)])
      if (found) return found
    }
    return null
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const found = firstFieldError(item, GENERAL_ERROR_KEYS.has(key) ? path : [...path, key])
      if (found) return found
    }
  }
  return null
}

export function firstErrorMessage(detail: string, status: number): string {
  const fallback = `Ett fel uppstod (${status}).`
  try {
    const found = firstFieldError(JSON.parse(detail))
    if (found) return found.path.length > 0 ? `${found.path.join(".")}: ${found.message}` : found.message
  } catch {
    // Never expose a raw HTML or otherwise unstructured error response.
  }
  return fallback
}
