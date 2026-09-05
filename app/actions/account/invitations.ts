"use server"

import { revalidatePath } from "next/cache"
import { ACCOUNTS_ENDPOINTS, AUTH_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, extractSetCookie, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies, setSessionCookies } from "@/app/lib/session"
import { getCurrentUser } from "@/app/lib/dal"
import { readErrorBody, type FieldErrors } from "@/app/lib/api-errors"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import {
  houseInvitationSchema,
  type HouseInvitationValues,
  projectInvitationSchema,
  type ProjectInvitationValues,
  accountInvitationSchema,
  type AccountInvitationValues,
} from "@/app/lib/schemas"

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
