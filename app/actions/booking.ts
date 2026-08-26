"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"

export type CreateBookingState = { error?: string; success?: boolean } | undefined

export async function createBooking(
  _prevState: CreateBookingState,
  formData: FormData
): Promise<CreateBookingState> {
  const house = await resolveSelectedHouse()
  const visitor = formData.get("visitor")
  const start_date = formData.get("start_date")
  const end_date = formData.get("end_date")
  const path = formData.get("path")

  if (
    typeof house !== "string" || !house ||
    typeof visitor !== "string" || !visitor ||
    typeof start_date !== "string" || !start_date ||
    typeof end_date !== "string" || !end_date
  ) {
    return { error: "Alla fält måste fyllas i." }
  }

  if (end_date < start_date) {
    return { error: "Slutdatum kan inte vara före startdatum." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.bookings, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ house, visitor, start_date, end_date }),
  })

  if (!response.ok) {
    return { error: "Kunde inte skapa bokningen. Försök igen." }
  }

  revalidatePath(typeof path === "string" && path ? path : "/besok")

  return { success: true }
}

export async function updateBooking(
  id: string,
  _prevState: CreateBookingState,
  formData: FormData
): Promise<CreateBookingState> {
  const visitor = formData.get("visitor")
  const start_date = formData.get("start_date")
  const end_date = formData.get("end_date")
  const path = formData.get("path")

  if (
    typeof visitor !== "string" || !visitor ||
    typeof start_date !== "string" || !start_date ||
    typeof end_date !== "string" || !end_date
  ) {
    return { error: "Alla fält måste fyllas i." }
  }

  if (end_date < start_date) {
    return { error: "Slutdatum kan inte vara före startdatum." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.bookings}${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ visitor, start_date, end_date }),
  })

  if (!response.ok) {
    return { error: "Kunde inte spara bokningen. Försök igen." }
  }

  revalidatePath(typeof path === "string" && path ? path : "/besok")

  return { success: true }
}
