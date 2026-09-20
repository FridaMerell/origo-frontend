import { cookies } from "next/headers"
import { FACILITY_COOKIE } from "@/app/lib/config"
import { getFacilities } from "@/app/lib/dal"

/** Facility chosen via cookie, falling back to the first one. Server-only. */
export async function getSelectedFacility() {
  const [facilities, cookieStore] = await Promise.all([getFacilities(), cookies()])
  const selectedId = cookieStore.get(FACILITY_COOKIE)?.value
  return facilities.find((f) => String(f.id) === selectedId) ?? facilities[0] ?? null
}

export async function resolveSelectedHouse(): Promise<string | null> {
  return (await getSelectedFacility())?.id ?? null
}
