"use server"

import { revalidatePath } from "next/cache"
import { AUTH_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { getCurrentUser } from "@/app/lib/dal"
import { readErrorBody } from "@/app/lib/api-errors"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import {
  accountProfileSchema,
  type AccountProfileValues,
  passwordChangeSchema,
  type PasswordChangeValues,
} from "@/app/lib/schemas"
import type { AccountActionResult } from "./shared"
import type { FieldErrors } from "@/app/lib/api-errors"

export async function updateProfile(
  data: AccountProfileValues,
): Promise<AccountActionResult<AccountProfileValues>> {
  const parsed = accountProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }
  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(AUTH_ENDPOINTS.profile(user.id), {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email,
    }),
  })

  if (!response.ok) {
    const { message, fieldErrors } = readErrorBody<AccountProfileValues>(
      await response.text().catch(() => ""),
      ["first_name", "last_name", "email"],
    )
    if (fieldErrors) return { fieldErrors }
    return { error: message ?? `Kunde inte spara ändringarna (${response.status}).` }
  }

  revalidatePath("/konto")
  return { success: true }
}

export async function changePassword(
  data: PasswordChangeValues,
): Promise<AccountActionResult<PasswordChangeValues>> {
  const parsed = passwordChangeSchema.safeParse(data)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path[0]
    if (path === "current_password" || path === "new_password" || path === "confirm_password") {
      return { fieldErrors: { [path]: issue.message } as FieldErrors<PasswordChangeValues> }
    }
    return { error: issue?.message ?? "Kontrollera fälten och försök igen." }
  }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(AUTH_ENDPOINTS.setPassword, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      current_password: parsed.data.current_password,
      new_password: parsed.data.new_password,
    }),
  })

  if (!response.ok) {
    const { message, fieldErrors } = readErrorBody<PasswordChangeValues>(
      await response.text().catch(() => ""),
      ["current_password", "new_password"],
    )
    if (fieldErrors) return { fieldErrors }
    return { error: message ?? `Kunde inte byta lösenord (${response.status}).` }
  }

  return { success: true }
}
