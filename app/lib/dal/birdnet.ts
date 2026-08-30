import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { fetchItem, fetchList } from "@/app/lib/dal/client"
import { getSessionCookies } from "@/app/lib/session"

export type BirdnetDevice = {
  id: string
  identifier: string
  name: string
  users: number[]
  house: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type BirdnetDeviceInput = {
  identifier: string
  name: string
  users: number[]
  house: string | null
  is_active: boolean
}

export type BirdnetDeviceCollection = {
  devices: BirdnetDevice[]
  loadError: string | null
}

export const getBirdnetDevices = cache(
  (): Promise<BirdnetDevice[]> => fetchList(TEMPUS_ENDPOINTS.birdnetDevices)
)

export const getBirdnetDevice = cache(
  (id: string): Promise<BirdnetDevice | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.birdnetDevices}${id}/`)
)

export const getBirdnetDeviceCollection = cache(
  async (): Promise<BirdnetDeviceCollection> => {
    const { sessionId, csrfToken } = await getSessionCookies()
    if (!sessionId) {
      return { devices: [], loadError: "BirdNET-enheterna kunde inte hämtas utan en giltig session." }
    }

    try {
      const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.birdnetDevices, {
        headers: {
          Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
        },
      })
      if (!response.ok) {
        return {
          devices: [],
          loadError: `BirdNET-enheterna kunde inte hämtas (HTTP ${response.status}).`,
        }
      }

      const body: unknown = await response.json()
      const devices = Array.isArray(body)
        ? body as BirdnetDevice[]
        : typeof body === "object" && body !== null && Array.isArray((body as { results?: unknown }).results)
          ? (body as { results: BirdnetDevice[] }).results
          : []
      return { devices, loadError: null }
    } catch {
      return { devices: [], loadError: "BirdNET-enheterna kunde inte hämtas eftersom API:t inte gick att nå." }
    }
  }
)
