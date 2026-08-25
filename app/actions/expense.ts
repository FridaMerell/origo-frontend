"use server"

import { revalidatePath } from "next/cache"
import { FACILITY_COOKIE, VERSO_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { cookies } from "next/headers"

export type CreateExpenseState = { error?: string; success?: boolean } | undefined

export async function createExpense(
  _prevState: CreateExpenseState,
  formData: FormData
): Promise<CreateExpenseState> {
  const cookieStore = await cookies()
  const house = cookieStore.get(FACILITY_COOKIE)?.value
  const venture = formData.get("venture")
  const amount = formData.get("amount")
  const description = formData.get("description")
  const dateIncurred = formData.get("date_incurred")

  if (
    typeof house !== "string" || !house ||
    typeof amount !== "string" || !amount ||
    typeof description !== "string" || !description ||
    typeof dateIncurred !== "string" || !dateIncurred
  ) {
    return { error: "Alla fält måste fyllas i." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.expenses, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({
      house,
      venture: venture || null,
      amount,
      description,
      date_incurred: dateIncurred,
    }),
  })

  if (!response.ok) {
    return { error: "Utgiften kunde inte skapas. Försök igen." }
  }

  revalidatePath("/planera")

  return { success: true }
}
