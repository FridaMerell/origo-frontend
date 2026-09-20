import type { Album } from "@/app/lib/dal"
import type { PhotoFormValues } from "@/app/lib/schemas"

const HISTORY_KEYS = [
  "taken_at",
  "date_precision",
  "place",
  "source",
  "transcription",
  "credit",
  "people",
] as const

/** True when any of the chosen album ids is a history album. */
export function inHistoryAlbum(albumIds: string[] | undefined, albums: Album[]): boolean {
  const chosen = new Set((albumIds ?? []).map(String))
  return albums.some((album) => album.kind === "history" && chosen.has(String(album.id)))
}

/** Plain photo forms never send history fields, so saving them cannot overwrite history data. */
export function withoutHistoryFields(data: PhotoFormValues): PhotoFormValues {
  const copy = { ...data }
  for (const key of HISTORY_KEYS) delete copy[key]
  return copy
}
