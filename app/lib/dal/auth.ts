import { cache } from "react"
import { redirect } from "next/navigation"
import { AUTH_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"

export type User = {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email?: string
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return null

  const response = await fetchOrigoApi(AUTH_ENDPOINTS.user, {
    headers: {
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })
  if (!response.ok) {
    return null
  }
  const responseJson = await response.json()
  return responseJson[0] ?? null
})

export async function verifySession() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return { isAuth: true, user }
}
