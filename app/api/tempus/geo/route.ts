import { type NextRequest } from "next/server"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { getSessionCookies } from "@/app/lib/session"

const resources = {
  "country-overview": () => TEMPUS_ENDPOINTS.countryOverview,
  "land-cover": () => TEMPUS_ENDPOINTS.landCover,
  "administrative-boundaries": () => TEMPUS_ENDPOINTS.administrativeBoundaries,
  "locale-land-cover": (localeId: string) => TEMPUS_ENDPOINTS.localeLandCover(localeId),
  "locale-land-cover-map": (localeId: string) => TEMPUS_ENDPOINTS.localeLandCoverMap(localeId),
  "locale-land-cover-fetch": (localeId: string) => TEMPUS_ENDPOINTS.localeLandCoverFetch(localeId),
  "locale-administrative-boundaries": (localeId: string) => TEMPUS_ENDPOINTS.localeAdministrativeBoundaries(localeId),
} as const

type Resource = keyof typeof resources

function isResource(value: string | null): value is Resource {
  return value !== null && value in resources
}

export async function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get("resource")
  const localeId = request.nextUrl.searchParams.get("locale")
  if (!isResource(resource)) return Response.json({ detail: "Okänd kartresurs." }, { status: 400 })
  if (resource.startsWith("locale-") && !localeId) return Response.json({ detail: "Plats saknas." }, { status: 400 })

  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return Response.json({ detail: "Inloggning krävs." }, { status: 401 })

  const path = resource.startsWith("locale-") ? resources[resource](localeId!) : resources[resource]()
  const params = new URLSearchParams(request.nextUrl.searchParams)
  params.delete("resource")
  params.delete("locale")
  const response = await fetchOrigoApi(`${path}${params.size ? `?${params}` : ""}`, {
    headers: { Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }) },
    cache: "no-store",
  })

  const retryAfter = response.headers.get("Retry-After")
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      ...(retryAfter ? { "Retry-After": retryAfter } : {}),
    },
  })
}
