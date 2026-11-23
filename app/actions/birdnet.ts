"use server"

import { revalidatePath } from "next/cache"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { firstErrorMessage } from "@/app/lib/api-errors"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import type { BirdnetDeviceInput } from "@/app/lib/dal/birdnet"
import { getCurrentUser } from "@/app/lib/dal/auth"

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

const birdnetErrorMessage = (detail: string, status: number) =>
  firstErrorMessage(detail, status, status === 404 ? { fallback: "BirdNET-API:t är inte tillgängligt ännu." } : {})

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
    headers: await authedJsonHeaders(),
    body: JSON.stringify(normalizedInput(input)),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: birdnetErrorMessage(detail, response.status) }
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
    headers: await authedJsonHeaders(),
    body: JSON.stringify(normalizedInput(input)),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: birdnetErrorMessage(detail, response.status) }
  }

  revalidatePath("/birdnet")
  return { success: true, deviceId: id }
}
