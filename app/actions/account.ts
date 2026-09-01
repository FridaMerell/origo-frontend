"use server"

import { revalidatePath } from "next/cache"
import { ACCOUNTS_ENDPOINTS, AUTH_ENDPOINTS, VERSO_ENDPOINTS } from "@/app/lib/config"
import {
  buildCookieHeader,
  extractSetCookie,
  fetchOrigoApi,
} from "@/app/lib/api-client"
import { getSessionCookies, setSessionCookies } from "@/app/lib/session"
import { getCurrentUser } from "@/app/lib/dal"
import {
  accountProfileSchema,
  type AccountProfileValues,
  createHouseSchema,
  type CreateHouseValues,
  houseInvitationSchema,
  type HouseInvitationValues,
  projectInvitationSchema,
  type ProjectInvitationValues,
  accountInvitationSchema,
  type AccountInvitationValues,
  passwordChangeSchema,
  type PasswordChangeValues,
} from "@/app/lib/schemas"

type FieldErrors<T> = Partial<Record<keyof T, string>>

export type AccountActionResult<T> =
  | { success?: boolean; error?: string; fieldErrors?: FieldErrors<T> }
  | undefined

async function authedJsonHeaders() {
  const { sessionId, csrfToken } = await getSessionCookies()
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken ?? "",
    Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
  }
}

// DRF returns `{ "email": ["…"], … }` for validation errors and `{ "detail": "…" }`
// otherwise. Pull the first message per known field; fall back to `detail`.
function readErrorBody<T>(
  detail: string,
  fields: readonly (keyof T)[],
): { message?: string; fieldErrors?: FieldErrors<T> } {
  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>
    const fieldErrors: FieldErrors<T> = {}
    for (const field of fields) {
      const raw = parsed[field as string]
      const text = Array.isArray(raw) ? raw[0] : typeof raw === "string" ? raw : undefined
      if (typeof text === "string") fieldErrors[field] = text
    }
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
    if (typeof parsed.detail === "string") return { message: parsed.detail }
  } catch {
    // Not JSON (e.g. an HTML error page) — never surface the raw body.
  }
  return {}
}

export async function updateProfile(
  data: AccountProfileValues,
): Promise<AccountActionResult<AccountProfileValues>> {
  const parsed = accountProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(AUTH_ENDPOINTS.user, {
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

type InvitationResult = {
  token?: string
  error?: string
  fieldErrors?: FieldErrors<ProjectInvitationValues>
}

// One target at most: a house, a Flux project, or nothing (a plain account).
type InvitationTarget =
  | { house: string }
  | { project: string }
  | Record<string, never>

async function createInvitation(
  target: InvitationTarget,
  data: { label: string; no_expiry: boolean },
): Promise<InvitationResult> {
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const body: Record<string, unknown> = { label: data.label }
  if ("house" in target) body.house = Number(target.house)
  if ("project" in target) body.project = Number(target.project)
  if (data.no_expiry) body.expires_at = null

  const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.invitations, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const { message, fieldErrors } = readErrorBody<ProjectInvitationValues>(
      await response.text().catch(() => ""),
      ["label", "project"],
    )
    if (fieldErrors) return { fieldErrors }
    return { error: message ?? `Kunde inte skapa inbjudan (${response.status}).` }
  }

  const created = (await response.json().catch(() => null)) as { token?: unknown } | null
  revalidatePath("/konto/anslutningar")
  if (typeof created?.token !== "string") {
    return { error: "Inbjudan skapades men svaret saknade en token." }
  }
  return { token: created.token }
}

export async function createHouseInvitation(
  houseId: string,
  data: HouseInvitationValues,
): Promise<InvitationResult> {
  if (!houseId) return { error: "Hus-id saknas." }
  const parsed = houseInvitationSchema.safeParse(data)
  if (!parsed.success) {
    return { fieldErrors: { label: parsed.error.issues[0]?.message ?? "Kontrollera fältet." } }
  }
  return createInvitation({ house: houseId }, parsed.data)
}

export async function createProjectInvitation(
  data: ProjectInvitationValues,
): Promise<InvitationResult> {
  const parsed = projectInvitationSchema.safeParse(data)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path[0]
    if (path === "label" || path === "project") {
      return { fieldErrors: { [path]: issue.message } as FieldErrors<ProjectInvitationValues> }
    }
    return { error: issue?.message ?? "Kontrollera fälten och försök igen." }
  }
  return createInvitation({ project: parsed.data.project }, parsed.data)
}

export async function createAccountInvitation(
  data: AccountInvitationValues,
): Promise<InvitationResult> {
  const parsed = accountInvitationSchema.safeParse(data)
  if (!parsed.success) {
    return { fieldErrors: { label: parsed.error.issues[0]?.message ?? "Kontrollera fältet." } }
  }
  return createInvitation({}, parsed.data)
}

export async function revokeInvitation(
  id: string,
): Promise<{ error?: string; success?: boolean }> {
  if (!id) return { error: "Inbjudnings-id saknas." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.invitation(id), {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })

  if (!response.ok && response.status !== 404) {
    return { error: `Kunde inte återkalla inbjudan (${response.status}).` }
  }

  revalidatePath("/konto/anslutningar")
  return { success: true }
}

export const revokeHouseInvitation = revokeInvitation

export type RedeemInput = {
  token: string
  username?: string
  password?: string
  email?: string
}

export type RedeemResult = {
  // "account" when the invitation carried no house or project.
  targetKind?: "house" | "project" | "account"
  target?: { id: number; name: string } | null
  // Retained for existing callers — set only for house invitations.
  house?: { id: number; name: string }
  created?: boolean
  error?: string
  fieldErrors?: { token?: string; username?: string; password?: string }
}

function readRedeemError(detail: string): RedeemResult {
  try {
    const parsed = JSON.parse(detail) as unknown
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return { error: parsed[0] }
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>
      const first = (key: string) => {
        const raw = record[key]
        return Array.isArray(raw) ? (typeof raw[0] === "string" ? raw[0] : undefined) : undefined
      }
      const fieldErrors: RedeemResult["fieldErrors"] = {}
      const token = first("token")
      const username = first("username")
      const password = first("password")
      if (token) fieldErrors.token = token
      if (username) fieldErrors.username = username
      if (password) fieldErrors.password = password
      if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
      if (typeof record.detail === "string") return { error: record.detail }
    }
  } catch {
    // not JSON
  }
  return {}
}

export async function redeemInvitation(input: RedeemInput): Promise<RedeemResult> {
  const token = input.token?.trim()
  if (!token) return { fieldErrors: { token: "Token saknas." } }

  const isSignup = Boolean(input.username || input.password)
  if (isSignup) {
    if (!input.username?.trim()) return { fieldErrors: { username: "Användarnamn krävs." } }
    if (!input.password) return { fieldErrors: { password: "Lösenord krävs." } }
  }

  const { sessionId, csrfToken: sessionCsrf } = await getSessionCookies()
  let csrfToken = sessionCsrf
  if (!csrfToken) {
    const csrfResponse = await fetchOrigoApi(AUTH_ENDPOINTS.csrf)
    csrfToken = extractSetCookie(csrfResponse, "csrftoken")
  }
  if (!csrfToken) return { error: "Kunde inte nå servern. Försök igen." }

  const body: Record<string, unknown> = { token }
  if (isSignup) {
    body.username = input.username?.trim()
    body.password = input.password
    if (input.email?.trim()) body.email = input.email.trim()
  }

  const response = await fetchOrigoApi(ACCOUNTS_ENDPOINTS.redeemInvitation, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const parsed = readRedeemError(await response.text().catch(() => ""))
    if (parsed.fieldErrors || parsed.error) return parsed
    return { error: `Kunde inte lösa in inbjudan (${response.status}).` }
  }

  // Anonymous signup: the server signs the user in via a Set-Cookie.
  const newSessionId = extractSetCookie(response, "sessionid")
  if (newSessionId) {
    const rotatedCsrf = extractSetCookie(response, "csrftoken") ?? csrfToken
    await setSessionCookies(newSessionId, rotatedCsrf)
  }

  const data = (await response.json().catch(() => null)) as {
    target_kind?: "house" | "project" | "account"
    target?: { id: number; name: string } | null
    created?: boolean
  } | null

  const targetKind = data?.target_kind ?? "house"
  const target = data?.target ?? null

  revalidatePath("/konto/anslutningar")
  return {
    targetKind,
    target,
    house: targetKind === "house" && target ? target : undefined,
    created: data?.created,
  }
}

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
