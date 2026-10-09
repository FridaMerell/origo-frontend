"use server"

import { revalidatePath, updateTag } from "next/cache"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { TEMPUS_GEO_AREAS_TAG } from "@/app/lib/dal/tempus/geo"
import { getCurrentUser } from "@/app/lib/dal/auth"
import { authedJsonHeaders, responseErrorMessage } from "./request"

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
    return { error: await responseErrorMessage(response) }
  }
  const created = (await response.json().catch(() => null)) as { id?: unknown } | null
  updateTag(TEMPUS_GEO_AREAS_TAG)
  revalidatePath("/maps")
  return { success: true, id: typeof created?.id === "string" ? created.id : undefined }
}
