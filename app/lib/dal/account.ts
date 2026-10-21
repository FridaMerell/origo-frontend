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

// One entry in the user's own action history. The response shape of
// GET /api/accounts/activity/ is read defensively (same approach as
// actions/notifications.ts), so every field except `id` may be empty.
// `id` is the list key, built from the row's app, kind and pk.
export type ActivityItem = {
  id: string
  action: string
  description: string
  target: string
  createdAt: string | null
}

function textFrom(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return ""
}

function activityFrom(value: unknown, index: number): ActivityItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const id = record.id
  // The feed is a union of several tables, so a row's pk is only unique
  // together with its app and kind.
  return {
    id:
      typeof id === "string" || typeof id === "number"
        ? `${textFrom(record, ["app"])}-${textFrom(record, ["kind"])}-${id}`
        : `activity-${index}`,
    action: textFrom(record, ["action", "verb", "type", "kind", "event"]),
    description: textFrom(record, [
      "description",
      "summary",
      "message",
      "title",
      "text",
    ]),
    target: textFrom(record, [
      "target",
      "target_label",
      "object",
      "object_repr",
      "label",
    ]),
    createdAt:
      textFrom(record, [
        "occurred_at",
        "created_at",
        "createdAt",
        "timestamp",
        "created",
        "time",
      ]) ||
      null,
  }
}

// The user's latest actions across products, newest first as returned by the API.
export const getActivity = cache(async (): Promise<ActivityItem[]> => {
  const raw = await fetchList<unknown>(ACCOUNTS_ENDPOINTS.activity)
  return raw
    .map(activityFrom)
    .filter((item): item is ActivityItem => item !== null)
})
