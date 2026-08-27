"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { bookingFormSchema, type BookingFormValues } from "@/app/lib/schemas"

export type CreateBookingState = { error?: string; success?: boolean } | undefined

export async function createBooking(
  house: string,
  data: BookingFormValues,
  path?: string
): Promise<CreateBookingState> {
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }
  const parsed = bookingFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Alla fält måste fyllas i." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.bookings, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ house, ...parsed.data }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: `Kunde inte skapa bokningen. Försök igen. (${response.status}: ${detail})` }
  }

  revalidatePath(path || "/besok")

  return { success: true }
}

export async function updateBooking(
  id: string,
  data: BookingFormValues,
  path?: string
): Promise<CreateBookingState> {
  const parsed = bookingFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Alla fält måste fyllas i." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.bookings}${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify(parsed.data),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: `Kunde inte spara bokningen. Försök igen. (${response.status}: ${detail})` }
  }

  revalidatePath(path || "/besok")

  return { success: true }
}
