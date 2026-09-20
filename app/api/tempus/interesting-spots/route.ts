import { type NextRequest } from "next/server"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { getSessionCookies } from "@/app/lib/session"

export async function GET(request: NextRequest) {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return Response.json({ detail: "Inloggning krävs." }, { status: 401 })
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.interestingSpots}${request.nextUrl.search}`, {
    headers: { Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }) },
    cache: "no-store",
  })
  const retryAfter = response.headers.get("Retry-After")
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json", ...(retryAfter ? { "Retry-After": retryAfter } : {}) },
  })
}
