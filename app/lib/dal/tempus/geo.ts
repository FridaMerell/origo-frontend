import { cache } from "react"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
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
}

export const getTempusGeoAreas = cache(
  (params?: TempusListParams): Promise<TempusGeoArea[]> =>
    fetchList(TEMPUS_ENDPOINTS.geoAreas, params)
)


export const getTempusLocales = cache(
  (params?: TempusListParams) : Promise<TempusLocale[]> => 
    fetchList(TEMPUS_ENDPOINTS.locales,params)
)

export const getTempusLocaleItem = cache(
  (id: string | number): Promise<TempusLocale | null> =>
    fetchItem(`${TEMPUS_ENDPOINTS.locales}${id}/`)
)
