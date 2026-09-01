import { cache } from "react"
import { ACCOUNTS_ENDPOINTS } from "@/app/lib/config"
import { fetchList } from "@/app/lib/dal/client"

// A shareable invitation link into a Verso house. Multi-use — redeeming does not
// consume it. `token` is only present on the create response, never here.
export type HouseInvitation = {
  id: number
  house: number
  label: string
  created_by: number | null
  created_at: string
  expires_at: string | null
  revoked_at: string | null
  uses: number
  last_used_at: string | null
  is_active: boolean
}

// Returns every invitation for houses the user belongs to (active and inactive).
export const getHouseInvitations = cache(
  (): Promise<HouseInvitation[]> => fetchList(ACCOUNTS_ENDPOINTS.houseInvitations),
)
