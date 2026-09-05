"use server"

import { revalidatePath } from "next/cache"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { getCurrentUser } from "@/app/lib/dal"
import { authedJsonHeaders, firstErrorMessage } from "./request"

export type GeoAreaKind = "country" | "county" | "province" | "nature_reserve" | "biological_area"
export type GeoAreaPolygon = { type: "Polygon"; coordinates: readonly (readonly (readonly number[])[])[] }
export type CreateGeoAreaInput = { name: string; kind: GeoAreaKind; geometry: GeoAreaPolygon | null }
export type CreateGeoAreaResult = { error?: string; success?: boolean; id?: string }

const GEO_AREA_KINDS: readonly GeoAreaKind[] = ["country", "county", "province", "nature_reserve", "biological_area"]

export async function createGeoArea(input: CreateGeoAreaInput): Promise<CreateGeoAreaResult> {
  const name = input.name.trim()
  if (!name) return { error: "Ange ett namn för området." }
  if (!GEO_AREA_KINDS.includes(input.kind)) return { error: "Välj en giltig områdestyp." }
  if (!input.geometry || input.geometry.type !== "Polygon") return { error: "Rita ett område med minst tre punkter." }
  const outerRing = input.geometry.coordinates[0]
  if (!outerRing || outerRing.length < 4) return { error: "Rita ett område med minst tre punkter." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.geoAreas, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      name,
      kind: input.kind,
      country_code: "SE",
      geometry: { type: "MultiPolygon", coordinates: [input.geometry.coordinates] },
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  const created = (await response.json().catch(() => null)) as { id?: unknown } | null
  revalidatePath("/maps")
  return { success: true, id: typeof created?.id === "string" ? created.id : undefined }
}
