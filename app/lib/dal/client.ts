import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

export function buildQuery(params?: QueryParams): string {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}

async function authedFetch(path: string) {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return null

  const response = await fetchOrigoApi(path, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  return response
}

export async function fetchList<T>(
  path: string,
  params?: QueryParams
): Promise<T[]> {
  const response = await authedFetch(`${path}${buildQuery(params)}`)
  if (!response || !response.ok) return []
  return response.json()
}

export async function fetchItem<T>(path: string): Promise<T | null> {
  const response = await authedFetch(path)
  if (!response || !response.ok) return null
  return response.json()
}
