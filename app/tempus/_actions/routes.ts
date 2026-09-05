"use server"

import { revalidatePath } from "next/cache"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { getCurrentUser } from "@/app/lib/dal"
import {
  getTempusRouteStops,
  type TempusSuggestedStop,
  type TempusSuggestedStopsRun,
} from "@/app/tempus/_data/routes"
import { type RouteFormValues, routeFormSchema } from "@/app/lib/schemas"
import { getSessionCookies } from "@/app/lib/session"
import { authedJsonHeaders, firstErrorMessage } from "./request"

export type RouteResult = { success?: boolean; routeId?: string; error?: string }

export async function createRoute(input: RouteFormValues): Promise<RouteResult> {
  const parsed = routeFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.routes, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(parsed.data),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  const created = (await response.json().catch(() => null)) as { id?: unknown } | null
  revalidatePath("/rutt")
  return { success: true, routeId: typeof created?.id === "string" ? created.id : undefined }
}

export async function updateRoute(id: string, input: Partial<RouteFormValues>): Promise<RouteResult> {
  const parsed = routeFormSchema.partial().safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.routes}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(parsed.data),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  revalidatePath("/rutt")
  revalidatePath(`/rutt/${id}`)
  return { success: true, routeId: id }
}

export async function deleteRoute(id: string): Promise<{ success?: boolean; error?: string }> {
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const { sessionId, csrfToken } = await getSessionCookies()
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.routes}${id}/`, {
    method: "DELETE",
    headers: {
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })
  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  revalidatePath("/rutt")
  return { success: true }
}

export type AddRouteStopInput = {
  route: string
  name: string
  location: { type: "Point"; coordinates: [number, number] }
  planned_at?: string | null
}

export async function createRouteStop(input: AddRouteStopInput): Promise<{ success?: boolean; error?: string }> {
  if (!input.route || !input.name.trim()) return { error: "Ruttstoppet saknar namn eller rutt." }
  if (input.location?.type !== "Point" || input.location.coordinates.length !== 2) {
    return { error: "Ruttstoppet saknar en giltig position." }
  }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const existing = await getTempusRouteStops(input.route)
  const nextSequence = existing.reduce((max, stop) => Math.max(max, stop.sequence), 0) + 1
  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.routeStops, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      route: input.route,
      sequence: nextSequence,
      name: input.name.trim(),
      location: input.location,
      planned_at: input.planned_at ?? null,
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  revalidatePath(`/rutt/${input.route}`)
  return { success: true }
}

export async function deleteRouteStop(routeId: string, stopId: string): Promise<{ success?: boolean; error?: string }> {
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const { sessionId, csrfToken } = await getSessionCookies()
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.routeStops}${stopId}/`, {
    method: "DELETE",
    headers: {
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })
  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  revalidatePath(`/rutt/${routeId}`)
  return { success: true }
}

export type SuggestedStopsParams = {
  taxon_id?: number | null
  since_days?: number
  notable_days?: number
  max_detour_m?: number | null
  num_stops?: number
  refresh?: boolean
}
export type SuggestedStopsRunResult = { data?: TempusSuggestedStopsRun; error?: string }

function suggestedStopsQuery(params: SuggestedStopsParams): string {
  const search = new URLSearchParams()
  if (params.taxon_id && params.taxon_id > 0) search.set("taxon_id", String(params.taxon_id))
  if (params.since_days) search.set("since_days", String(params.since_days))
  if (params.notable_days) search.set("notable_days", String(params.notable_days))
  if (typeof params.max_detour_m === "number" && params.max_detour_m >= 0) search.set("max_detour_m", String(params.max_detour_m))
  if (params.num_stops) search.set("num_stops", String(params.num_stops))
  if (params.refresh) search.set("refresh", "true")
  const query = search.toString()
  return query ? `?${query}` : ""
}

function parseSuggestedStopsRun(body: unknown): TempusSuggestedStopsRun | null {
  if (!body || typeof body !== "object") return null
  const run = body as Partial<TempusSuggestedStopsRun>
  if (typeof run.status !== "string") return null
  return {
    route: typeof run.route === "string" ? run.route : "",
    status: run.status as TempusSuggestedStopsRun["status"],
    params: run.params && typeof run.params === "object" ? run.params as Record<string, unknown> : {},
    result: Array.isArray(run.result) ? run.result as TempusSuggestedStop[] : [],
    error: typeof run.error === "string" ? run.error : "",
    created_at: typeof run.created_at === "string" ? run.created_at : "",
    started_at: typeof run.started_at === "string" ? run.started_at : null,
    finished_at: typeof run.finished_at === "string" ? run.finished_at : null,
  }
}

export async function startSuggestedStops(routeId: string, params: SuggestedStopsParams = {}): Promise<SuggestedStopsRunResult> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return { error: "Du måste vara inloggad." }
  let response: Response
  try {
    response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.routeSuggestedStops(routeId)}${suggestedStopsQuery(params)}`, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken ?? "",
        Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
      },
    })
  } catch {
    return { error: "Kunde inte nå servern. Försök igen om en stund." }
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  const run = parseSuggestedStopsRun(await response.json().catch(() => null))
  return run ? { data: run } : { error: "Kunde inte tolka svaret från servern." }
}

export async function pollSuggestedStops(routeId: string): Promise<SuggestedStopsRunResult> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return { error: "Du måste vara inloggad." }
  let response: Response
  try {
    response = await fetchOrigoApi(TEMPUS_ENDPOINTS.routeSuggestedStops(routeId), {
      headers: { Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }) },
    })
  } catch {
    return { error: "Kunde inte nå servern. Försök igen om en stund." }
  }
  if (response.status === 404) return { error: "Ingen sökning har startats för den här rutten." }
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  const run = parseSuggestedStopsRun(await response.json().catch(() => null))
  return run ? { data: run } : { error: "Kunde inte tolka svaret från servern." }
}
