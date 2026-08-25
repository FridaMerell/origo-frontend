import { cookies } from "next/headers"
import { FACILITY_COOKIE } from "@/app/lib/config"
import { getFacilities } from "@/app/lib/dal"

export async function resolveSelectedHouse(): Promise<string | null> {
  const cookieStore = await cookies()
  const selectedId = cookieStore.get(FACILITY_COOKIE)?.value
  const facilities = await getFacilities()
  const facility = facilities.find((f) => String(f.id) === selectedId) ?? facilities[0] ?? null
  return facility?.id ?? null
}
