"use server"

import { revalidatePath } from "next/cache"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import type { BirdnetDeviceInput } from "@/app/lib/dal/birdnet"
import { getCurrentUser } from "@/app/lib/dal/auth"
import { getSessionCookies } from "@/app/lib/session"

export type BirdnetDeviceActionResult = {
  success?: boolean
  deviceId?: string
  error?: string
}

function validateDeviceInput(input: BirdnetDeviceInput): string | null {
  if (!input.identifier.trim()) return "Ange enhets-ID."
  if (!input.name.trim()) return "Ange ett namn för enheten."
  if (input.users.length === 0) return "Välj minst en användare."
  if (!input.users.every((id) => Number.isInteger(id) && id > 0)) {
    return "En eller flera användare är ogiltiga."
  }
  return null
}

function firstErrorMessage(detail: string, status: number): string {
  const fallback = status === 404
    ? "BirdNET-API:t är inte tillgängligt ännu."
    : `Ett fel uppstod (${status}).`

  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>
    const preferredKeys = ["identifier", "users", "house", "is_active", "non_field_errors", "detail"]
    for (const key of preferredKeys) {
      const value = parsed[key]
      if (Array.isArray(value) && typeof value[0] === "string") return value[0]
      if (typeof value === "string") return value
    }
  } catch {
    // Never expose a raw API or HTML error response in the UI.
  }

  return fallback
}

async function mutationHeaders() {
  const { sessionId, csrfToken } = await getSessionCookies()
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken ?? "",
    Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
  }
}

function normalizedInput(input: BirdnetDeviceInput): BirdnetDeviceInput {
  return {
    identifier: input.identifier.trim(),
    name: input.name.trim(),
    users: [...new Set(input.users)],
    house: input.house || null,
    is_active: input.is_active,
  }
}

export async function createBirdnetDevice(
  input: BirdnetDeviceInput
): Promise<BirdnetDeviceActionResult> {
  const validationError = validateDeviceInput(input)
  if (validationError) return { error: validationError }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.birdnetDevices, {
    method: "POST",
    headers: await mutationHeaders(),
    body: JSON.stringify(normalizedInput(input)),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  const created = (await response.json().catch(() => null)) as { id?: unknown } | null
  revalidatePath("/birdnet")
  return {
    success: true,
    deviceId: typeof created?.id === "string" ? created.id : undefined,
  }
}

export async function updateBirdnetDevice(
  id: string,
  input: BirdnetDeviceInput
): Promise<BirdnetDeviceActionResult> {
  const validationError = validateDeviceInput(input)
  if (validationError) return { error: validationError }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.birdnetDevices}${id}/`, {
    method: "PATCH",
    headers: await mutationHeaders(),
    body: JSON.stringify(normalizedInput(input)),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/birdnet")
  return { success: true, deviceId: id }
}
