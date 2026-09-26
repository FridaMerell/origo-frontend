"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import {
  albumFormSchema,
  photoFormSchema,
  type AlbumFormValues,
  type PhotoFormValues,
} from "@/app/lib/schemas"

export type PhotoActionState = { error?: string; success?: boolean; id?: string } | undefined

/** File data for a photo that has already been uploaded through /api/upload. */
export type UploadedPhoto = {
  url: string
  thumbnail_url?: string
  width?: number
  height?: number
  taken_at?: string | null
}

const BANK_PATH = "/bilder"

/** "1923-05-01" from a date input -> an ISO timestamp the API accepts. */
function dateToIso(date: string | undefined): string | undefined {
  return date ? `${date}T00:00:00Z` : undefined
}

export async function createPhoto(
  uploaded: UploadedPhoto,
  data: PhotoFormValues,
  pathname: string = BANK_PATH
): Promise<PhotoActionState> {
  const parsed = photoFormSchema.safeParse(data)
  if (!parsed.success || !uploaded.url) {
    return { error: "Bilden kunde inte sparas." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const { venture, task, taken_at, ...rest } = parsed.data
  const response = await fetchOrigoApi(VERSO_ENDPOINTS.photos, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      house,
      venture: venture || null,
      task: task || null,
      ...uploaded,
      ...rest,
      // A date typed in the form wins over the file's modified time.
      taken_at: dateToIso(taken_at) ?? uploaded.taken_at,
    }),
  })
  if (!response.ok) {
    return { error: "Bilden kunde inte sparas. Försök igen." }
  }

  const photo: { id: string } = await response.json()
  revalidatePath(BANK_PATH)
  if (pathname !== BANK_PATH) revalidatePath(pathname)
  return { success: true, id: photo.id }
}

export async function updatePhoto(
  id: string,
  data: PhotoFormValues,
  pathname: string = BANK_PATH
): Promise<PhotoActionState> {
  const parsed = photoFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Bilden kunde inte sparas." }
  }

  const { venture, task, taken_at, ...rest } = parsed.data
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.photos}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      venture: venture || null,
      task: task || null,
      ...rest,
      ...(taken_at ? { taken_at: dateToIso(taken_at) } : {}),
    }),
  })
  if (!response.ok) {
    return { error: "Bilden kunde inte sparas. Försök igen." }
  }

  revalidatePath(BANK_PATH)
  if (pathname !== BANK_PATH) revalidatePath(pathname)
  return { success: true }
}

/** Links a photo to its counterpart (e.g. before -> after), or clears the link with null. */
export async function pairPhoto(id: string, pair: string | null): Promise<PhotoActionState> {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.photos}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ pair }),
  })
  if (!response.ok) {
    return { error: "Bilderna kunde inte kopplas. Försök igen." }
  }

  revalidatePath(BANK_PATH)
  return { success: true }
}

export async function deletePhoto(id: string, pathname: string = BANK_PATH): Promise<PhotoActionState> {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.photos}${id}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    return { error: "Bilden kunde inte tas bort. Försök igen." }
  }

  revalidatePath(BANK_PATH)
  if (pathname !== BANK_PATH) revalidatePath(pathname)
  return { success: true }
}

export async function createAlbum(data: AlbumFormValues): Promise<PhotoActionState> {
  const parsed = albumFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Namn krävs." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const { venture, ...rest } = parsed.data
  const response = await fetchOrigoApi(VERSO_ENDPOINTS.albums, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ house, venture: venture || null, ...rest }),
  })
  if (!response.ok) {
    return { error: "Albumet kunde inte skapas. Försök igen." }
  }

  const album: { id: string } = await response.json()
  revalidatePath(BANK_PATH)
  return { success: true, id: album.id }
}

export async function updateAlbum(id: string, data: AlbumFormValues): Promise<PhotoActionState> {
  const parsed = albumFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Namn krävs." }
  }

  const { venture, ...rest } = parsed.data
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.albums}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ venture: venture || null, ...rest }),
  })
  if (!response.ok) {
    return { error: "Albumet kunde inte sparas. Försök igen." }
  }

  revalidatePath(BANK_PATH)
  return { success: true }
}

export async function setAlbumCover(id: string, cover: string | null): Promise<PhotoActionState> {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.albums}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ cover }),
  })
  if (!response.ok) {
    return { error: "Omslagsbilden kunde inte sparas. Försök igen." }
  }

  revalidatePath(BANK_PATH)
  return { success: true }
}

export async function deleteAlbum(id: string): Promise<PhotoActionState> {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.albums}${id}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    return { error: "Albumet kunde inte tas bort. Försök igen." }
  }

  revalidatePath(BANK_PATH)
  return { success: true }
}

export async function createPhotoTag(name: string): Promise<PhotoActionState> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { error: "Namn krävs." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.photoTags, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ house, name: trimmed }),
  })
  if (!response.ok) {
    return { error: "Taggen kunde inte skapas. Den kanske redan finns." }
  }

  const tag: { id: string } = await response.json()
  revalidatePath(BANK_PATH)
  return { success: true, id: tag.id }
}
