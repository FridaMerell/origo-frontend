"use server"

import { ACCOUNTS_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import { getCurrentUser } from "@/app/lib/dal"
import { authedJsonHeaders } from "@/app/lib/auth-headers"

export type SelfTokenResult = { token?: string; error?: string }

async function readSelfToken(response: Response): Promise<SelfTokenResult> {
  if (!response.ok) return { error: `Något gick fel (${response.status}).` }
  const body = (await response.json().catch(() => null)) as { token?: unknown } | null
  return typeof body?.token === "string"
    ? { token: body.token }
    : { error: "Svaret saknade en token." }
}

// The account has a single personal API token (DRF TokenAuthentication). GET
// returns it, creating one if none exists.
export async function getSelfToken(): Promise<SelfTokenResult> {
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const { sessionId, csrfToken } = await getSessionCookies()
  const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.selfToken, {
    headers: { Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }) },
  })
  return readSelfToken(response)
}

// Replaces the token — any client still using the old value stops working.
export async function rotateSelfToken(): Promise<SelfTokenResult> {
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(`${ACCOUNTS_ENDPOINTS.selfToken}?rotate=1`, {
    method: "POST",
    headers: await authedJsonHeaders(),
  })
  return readSelfToken(response)
}

export async function revokeSelfToken(): Promise<{ success?: boolean; error?: string }> {
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.selfToken, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    return { error: `Kunde inte återkalla token (${response.status}).` }
  }
  return { success: true }
}
