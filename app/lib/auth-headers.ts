import { buildCookieHeader } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

/** Authenticated JSON request headers (session cookie + CSRF token) for POST/PATCH/DELETE calls to the Origo API. */
export async function authedJsonHeaders() {
  const { sessionId, csrfToken } = await getSessionCookies()
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken ?? "",
    Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
  }
}
