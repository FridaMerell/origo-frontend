import { buildQuery, type QueryParams } from "@/app/lib/dal/client"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

export type Page<T> = {
  results: T[]
  count: number
  next: string | null
  previous: string | null
  pageSize?: number
}

function isPaginatedEnvelope<T>(body: unknown): body is Page<T> {
  return (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { results?: unknown }).results)
  )
}

/** Fetches a `{ results, count, next, previous }` collection endpoint, tolerating a plain array response too. */
export async function fetchPage<T>(
  path: string,
  params?: QueryParams
): Promise<Page<T>> {
  const empty: Page<T> = { results: [], count: 0, next: null, previous: null }

  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return empty

  const response = await fetchOrigoApi(`${path}${buildQuery(params)}`, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  if (!response.ok) return empty

  const body: unknown = await response.json()
  if (isPaginatedEnvelope<T>(body)) {
    return {
      results: body.results,
      count: typeof body.count === "number" ? body.count : body.results.length,
      next: body.next ?? null,
      previous: body.previous ?? null,
    }
  }

  const results = Array.isArray(body) ? (body as T[]) : []
  return { results, count: results.length, next: null, previous: null }
}

/** Normalizes page/page_size query params (also mirrored as limit/offset for endpoints that expect that instead). */
export function paginationQuery(
  params: QueryParams | undefined,
  defaultPageSize: number,
  maxPageSize: number
): QueryParams & { page: number; page_size: number; limit: number; offset: number } {
  const requestedPage = Number(params?.page)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const requestedPageSize = Number(params?.page_size)
  const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0
    ? Math.min(requestedPageSize, maxPageSize)
    : defaultPageSize

  return {
    ...params,
    page,
    page_size: pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }
}
