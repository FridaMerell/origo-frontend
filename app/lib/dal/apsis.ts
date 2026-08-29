import { cache } from "react"
import { APSIS_ENDPOINTS } from "@/app/lib/config"
import { fetchItem, fetchList } from "@/app/lib/dal/client"

// Apsis — a church-apse photo catalogue. One flat resource: posts.
export type ApsisFile = { name: string; url: string }

export type ApsisPost = {
  id: number
  files: ApsisFile[]
  author: number | null
  geolocation: string
  content: string
  name: string
  created_at: string
}

export const getApsisPosts = cache(
  (): Promise<ApsisPost[]> => fetchList(APSIS_ENDPOINTS.posts)
)

export const getApsisPost = cache(
  (id: string): Promise<ApsisPost | null> => fetchItem(`${APSIS_ENDPOINTS.posts}${id}/`)
)
