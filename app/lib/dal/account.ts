import { cache } from "react"
import { ACCOUNTS_ENDPOINTS } from "@/app/lib/config"
import { fetchList } from "@/app/lib/dal/client"

export type InvitationTargetKind = "house" | "project" | "account"

// A shareable invitation link into a Verso house, a Flux project, or nothing at
// all (a plain Origo account). Multi-use — redeeming does not consume it.
// `token` is only present on the create response, never here. At most one of
// `house` / `project` is set; when both are null the invitation only grants an
// account (`target_kind` === "account").
export type Invitation = {
  id: number
  house: number | null
  project: number | null
  target_kind: InvitationTargetKind
  label: string
  created_by: number | null
  created_at: string
  expires_at: string | null
  revoked_at: string | null
  uses: number
  last_used_at: string | null
  is_active: boolean
}

// Back-compat alias — older imports still reference `HouseInvitation`.
export type HouseInvitation = Invitation

// Returns every invitation the user can see: those for houses and projects they
// belong to, plus their own targetless invitations (active and inactive).
export const getInvitations = cache(
  (): Promise<Invitation[]> => fetchList(ACCOUNTS_ENDPOINTS.invitations),
)
