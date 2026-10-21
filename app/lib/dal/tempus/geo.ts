import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { sharedOrigoJson } from "@/app/lib/api-client"
import { fetchItem, fetchList } from "@/app/lib/dal/client"
import type { TempusListParams } from "./shared"

type TempusGeoPosition = readonly [longitude: number, latitude: number, ...rest: number[]]

export type TempusGeoAreaGeometry =
  | {
      type: "Polygon"
      coordinates: readonly (readonly TempusGeoPosition[])[]
    }
  | {
      type: "MultiPolygon"
      coordinates: readonly (readonly (readonly TempusGeoPosition[])[])[]
    }

export type TempusGeoArea = {
  id: string
  name: string
  kind: "country" | "county" | "province" | "nature_reserve" | "biological_area"
  country_code: string
  geometry: TempusGeoAreaGeometry | null
}

export type TempusLocale = {
  id: number
  name: string
  geometry: Extract<TempusGeoAreaGeometry, { type: "MultiPolygon" }> | null
  user: number
  // Locales are public unless the owner marks them private.
  is_private: boolean
  // Only the owner may change or delete a locale; decided by the backend.
  editable: boolean
}

export const TEMPUS_GEO_AREAS_TAG = "tempus-geo-areas"

// The area list is the same for everyone and slow to produce (it carries every
// area's geometry), so the unfiltered list is read once and shared for an hour.
// Creating an area clears it (see _actions/geo-areas.ts).
const readSharedGeoAreas = sharedOrigoJson({ revalidate: 3600, tags: [TEMPUS_GEO_AREAS_TAG] })

export const getTempusGeoAreas = cache(
  async (params?: TempusListParams): Promise<TempusGeoArea[]> => {
    if (!params) {
      const payload = await readSharedGeoAreas(TEMPUS_ENDPOINTS.geoAreas)
      if (Array.isArray(payload)) return payload as TempusGeoArea[]
      const results = (payload as { results?: unknown } | null)?.results
      if (Array.isArray(results)) return results as TempusGeoArea[]
    }
    return fetchList(TEMPUS_ENDPOINTS.geoAreas, params)
  }
)


export const getTempusLocales = cache(
  (params?: TempusListParams) : Promise<TempusLocale[]> => 
    fetchList(TEMPUS_ENDPOINTS.locales,params)
)

export const getTempusLocaleItem = cache(
  (id: string | number): Promise<TempusLocale | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.locales}${id}/`)
)
