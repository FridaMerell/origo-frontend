"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { getCurrentUser } from "@/app/lib/dal"
import { readErrorBody } from "@/app/lib/api-errors"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import { createHouseSchema, type CreateHouseValues } from "@/app/lib/schemas"
import type { AccountActionResult } from "./shared"

export async function createHouse(
  data: CreateHouseValues,
): Promise<AccountActionResult<CreateHouseValues>> {
  const parsed = createHouseSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.facilities, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      name: parsed.data.name,
      address: parsed.data.address,
      lat: parsed.data.lat === "" ? null : Number(parsed.data.lat),
      lng: parsed.data.lng === "" ? null : Number(parsed.data.lng),
    }),
  })

  if (!response.ok) {
    const { message, fieldErrors } = readErrorBody<CreateHouseValues>(
      await response.text().catch(() => ""),
      ["name", "address", "lat", "lng"],
    )
    if (fieldErrors) return { fieldErrors }
    return { error: message ?? `Kunde inte skapa huset (${response.status}).` }
  }

  revalidatePath("/konto/anslutningar")
  return { success: true }
}

export async function updateHouse(
  id: string,
  data: CreateHouseValues,
): Promise<AccountActionResult<CreateHouseValues>> {
  if (!id) return { error: "Hus-id saknas." }
  const parsed = createHouseSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.facility(id), {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      name: parsed.data.name,
      address: parsed.data.address,
      lat: parsed.data.lat === "" ? null : Number(parsed.data.lat),
      lng: parsed.data.lng === "" ? null : Number(parsed.data.lng),
    }),
  })

  if (!response.ok) {
    const { message, fieldErrors } = readErrorBody<CreateHouseValues>(
      await response.text().catch(() => ""),
      ["name", "address", "lat", "lng"],
    )
    if (fieldErrors) return { fieldErrors }
    return { error: message ?? `Kunde inte spara huset (${response.status}).` }
  }

  revalidatePath("/konto/anslutningar")
  return { success: true }
}
