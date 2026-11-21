"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import {
  fireplaceHeatingFormSchema,
  residentialHeatingFormSchema,
  type FireplaceHeatingFormValues,
  type ResidentialHeatingFormValues,
} from "@/app/lib/schemas"
import { authedFetch } from "@/app/lib/dal/client"
import type { HeatingZone } from "@/app/lib/dal"

export type ResidentialHeatingActionState = { error?: string; success?: boolean } | undefined

/** Creates the house's connection, or updates it; an empty token keeps the stored one. */
export async function saveResidentialHeating(
  id: string | null,
  data: ResidentialHeatingFormValues
): Promise<ResidentialHeatingActionState> {
  const parsed = residentialHeatingFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Ange en giltig adress och enhetens id." }
  }
  const token = parsed.data.token?.trim()
  if (!id && !token) {
    return { error: "Token krävs." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const response = await fetchOrigoApi(
    id ? `${VERSO_ENDPOINTS.residentialHeating}${id}/` : VERSO_ENDPOINTS.residentialHeating,
    {
      method: id ? "PATCH" : "POST",
      headers: await authedJsonHeaders(),
      body: JSON.stringify({ house, base_url: parsed.data.base_url, device: parsed.data.device, ...(token ? { token } : {}) }),
    }
  )
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    return { error: payload ? `Kopplingen kunde inte sparas: ${JSON.stringify(payload)}` : "Kopplingen kunde inte sparas. Försök igen." }
  }

  revalidatePath("/uppvarmning")
  return { success: true }
}

/** Registers a fireplace heating on the connection's device; `startTime` is an ISO 8601 string with timezone. */
export async function registerFireplaceHeating(
  connection: string,
  data: FireplaceHeatingFormValues
): Promise<ResidentialHeatingActionState> {
  const parsed = fireplaceHeatingFormSchema.safeParse(data)
  const startTime = parsed.success ? new Date(parsed.data.start_time) : null
  if (!startTime || Number.isNaN(startTime.getTime())) {
    return { error: "Ange en giltig tidpunkt." }
  }

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.residentialHeating}${connection}/fireplace/`, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ start_time: startTime.toISOString() }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    return {
      error: payload
        ? `Brasan kunde inte sparas: ${payload.detail ?? JSON.stringify(payload)}`
        : `Brasan kunde inte sparas (svar ${response.status}).`,
    }
  }

  revalidatePath("/uppvarmning")
  revalidatePath("/")
  return { success: true }
}

/** Removes one registered fireplace heating from the connection's device. */
export async function deleteFireplaceHeating(
  connection: string,
  fireplace: number
): Promise<ResidentialHeatingActionState> {
  if (!connection || !Number.isInteger(fireplace)) {
    return { error: "Brasan kunde inte tas bort." }
  }

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.residentialHeating}${connection}/fireplace/${fireplace}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    return {
      error: payload?.detail
        ? `Brasan kunde inte tas bort: ${payload.detail}`
        : `Brasan kunde inte tas bort (svar ${response.status}).`,
    }
  }

  revalidatePath("/uppvarmning")
  revalidatePath("/")
  return { success: true }
}

/** Zones of one log, fetched through Verso's proxy when a row is expanded. */
export async function getHeatingLogZones(
  connection: string,
  log: number
): Promise<{ zones?: HeatingZone[]; error?: string }> {
  const path = `${VERSO_ENDPOINTS.residentialHeating}${connection}/logs/${log}/`
  const response = await authedFetch(path)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return { error: payload?.detail ?? `Verso svarade ${response.status} för ${path}.` }
  }
  return { zones: payload?.zones ?? [] }
}
