"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import { getCurrentUser } from "@/app/lib/dal"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import { expenseFormSchema, type ExpenseFormValues } from "@/app/lib/schemas"

export type CreateExpenseState = { error?: string; success?: boolean } | undefined

export async function createExpense(
  venture: string | undefined,
  data: ExpenseFormValues,
  path?: string
): Promise<CreateExpenseState> {
  const parsed = expenseFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Du måste vara inloggad." }
  }

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.expenses, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      house,
      venture: venture || null,
      user: user.id,
      ...parsed.data,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: `Utgiften kunde inte skapas. Försök igen. (${response.status}: ${detail})` }
  }

  revalidatePath(path || "/planera")

  return { success: true }
}
