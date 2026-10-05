import { cache } from "react"
import { APSIS_ENDPOINTS } from "@/app/lib/config"
import { fetchItem, fetchList } from "@/app/lib/dal/client"

// Apsis — a church-apse photo catalogue. One flat resource: posts.
export type ApsisFile = { name: string; url: string }

export type ApsisPost = {
  id: number
  files: ApsisFile[]
  author: number | null
  has_apsis: boolean
  geolocation: string
  content: string
  name: string
  svenska_kyrkan_place_id: string
  created_at: string
}

export type ApsisWeekday = "mo" | "tu" | "we" | "th" | "fr" | "sa" | "su"
export type ApsisFacility =
  | "toilet"
  | "accessible_toilet"
  | "cafe"
  | "wifi"
  | "parking"
  | "charging_station"
  | "hearing_loop"
  | "ramp"

// A church in Svenska kyrkan's PlatserAPI, as summarised by the Origo API.
export type ApsisPlace = {
  id: string
  name: string
  owner_name: string
  municipality: string
  county: string
  latitude: number | null
  longitude: number | null
  short_description: string
  // Markdown.
  long_description: string
  address: string
  postal_code: string
  city: string
  url: string
  email: string
  phone: string
  categories: string[]
  // What the parish itself points out, e.g. "Astronomiska uret".
  tags: string[]
  // Today's opening hours, as runs of days ("mo".."su") sharing the same hours.
  open_hours: Array<{ from: ApsisWeekday; to: ApsisWeekday; hours: string[] }>
  facilities: ApsisFacility[]
  links: Array<{ title: string; url: string }>
  // The church's record in Kyrkobyggnadsregistret, as KBR returned it. Only on
  // a single place, not on search hits; null when none could be matched safely.
  building?: Record<string, unknown> | null
}

export const getApsisPosts = cache(
  (): Promise<ApsisPost[]> => fetchList(APSIS_ENDPOINTS.posts)
)

export const getApsisPost = cache(
  (id: string): Promise<ApsisPost | null> => fetchItem(`${APSIS_ENDPOINTS.posts}${id}/`)
)
