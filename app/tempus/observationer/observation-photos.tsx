"use client"

import { useCallback, useRef, useState } from "react"
import { X } from "lucide-react"
import { twMerge } from "tailwind-merge"
import { fileProxyUrl } from "@/app/lib/files"
import { Lightbox } from "@/app/components/ui/Gallery"
import { compressImage, type CompressedImage } from "@/app/lib/image-thumbnail"
import { setObservationPhotos } from "@/app/tempus/_actions/observations"

const PHOTO = { maxBytes: 3 * 1024 * 1024, maxEdge: 3200 }
const THUMBNAIL = { maxBytes: 512 * 1024, maxEdge: 1024 }

/** Time and position read from the first image that carries them. */
export type PhotoMetadata = {
  takenAt?: Date
  lat?: number
  lon?: number
}

/** A datetime-local input value (local time, minutes) for the date. */
export function toDateTimeLocal(date: Date) {
  const local = new Date(date)
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset())
  return local.toISOString().slice(0, 16)
}

/** Reads the capture time and GPS position from the images' EXIF data, if any. */
export async function readPhotoMetadata(files: File[]): Promise<PhotoMetadata> {
  const exifr = (await import("exifr")).default
  const metadata: PhotoMetadata = {}
  for (const file of files) {
    // A format exifr cannot read (e.g. some PNG/WebP files) simply has no metadata to use.
    const [gps, tags] = await Promise.all([
      exifr.gps(file).catch(() => undefined),
      exifr.parse(file, ["DateTimeOriginal"]).catch(() => undefined),
    ])
    if (metadata.lat === undefined && gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      metadata.lat = gps.latitude
      metadata.lon = gps.longitude
    }
    const takenAt = tags?.DateTimeOriginal
    if (!metadata.takenAt && takenAt instanceof Date && !Number.isNaN(takenAt.getTime())) {
      metadata.takenAt = takenAt
    }
    if (metadata.takenAt && metadata.lat !== undefined) break
  }
  return metadata
}

/** The thumbnail's path: stored beside the photo with "-thumb" before the extension (see /api/upload). */
export function thumbnailPath(path: string) {
  return path.replace(/(\.[^./]+)?$/, "-thumb$1")
}

async function uploadErrorDetail(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null
  return typeof body?.error === "string" ? body.error : `status ${response.status}`
}

/**
 * Compresses each image (at most 3 MB, thumbnail at most 0.5 MB), uploads all
 * of them in one request to the observation's folder in R2 and adds the paths
 * to the observation's `photos`. Images that cannot be compressed are skipped
 * and named in the message; the rest are still uploaded. Returns a message
 * describing what failed, or null when everything was saved.
 */
export async function uploadObservationPhotos(
  observationId: string,
  existing: string[],
  files: File[],
  onProgress?: (message: string) => void,
): Promise<string | null> {
  // One image at a time: a decoded 12 MP photo is ~50 MB, so doing them all at
  // once can run a phone out of memory.
  const compressed: { photo: CompressedImage; thumbnail: CompressedImage }[] = []
  const unreadable: string[] = []
  for (const [index, file] of files.entries()) {
    onProgress?.(`Komprimerar bild ${index + 1} av ${files.length}…`)
    try {
      const photo = await compressImage(file, PHOTO)
      const thumbnail = await compressImage(file, THUMBNAIL, "-thumb")
      compressed.push({ photo, thumbnail })
    } catch {
      unreadable.push(file.name)
    }
  }
  const unreadableMessage = unreadable.length > 0 ? `Kunde inte läsa eller komprimera: ${unreadable.join(", ")}.` : null
  if (compressed.length === 0) return unreadableMessage

  const body = new FormData()
  body.set("folder", "tempus")
  body.set("observation", observationId)
  for (const { photo, thumbnail } of compressed) {
    body.append("file", photo.file)
    body.append("file", thumbnail.file)
  }

  onProgress?.(compressed.length === 1 ? "Laddar upp bilden…" : `Laddar upp ${compressed.length} bilder…`)
  let response: Response
  try {
    response = await fetch("/api/upload", { method: "POST", body })
  } catch {
    return [`Bilderna kunde inte laddas upp. Kontrollera anslutningen och försök igen.`, unreadableMessage].filter(Boolean).join(" ")
  }
  if (!response.ok) {
    return [`Bilderna kunde inte laddas upp (${await uploadErrorDetail(response)}).`, unreadableMessage].filter(Boolean).join(" ")
  }
  const uploaded = (await response.json().catch(() => null)) as { files?: { url: string }[] } | null
  if (!uploaded?.files || uploaded.files.length !== compressed.length * 2) {
    return [`Bilderna laddades upp men svaret gick inte att läsa.`, unreadableMessage].filter(Boolean).join(" ")
  }

  const photos = uploaded.files.filter((_, index) => index % 2 === 0).map((file) => file.url)
  onProgress?.("Sparar bilderna på observationen…")
  const result = await setObservationPhotos(observationId, [...existing, ...photos])
  if (result.error) {
    return [`Bilderna laddades upp men kunde inte sparas på observationen: ${result.error}`, unreadableMessage].filter(Boolean).join(" ")
  }
  return unreadableMessage
}

/**
 * Picks images by click or drag and drop. `onMetadata` gets the time and
 * position found in the newly added images; `onError` gets skipped files and
 * metadata that could not be read.
 */
export function ObservationPhotoPicker({
  files,
  onChange,
  onMetadata,
  onError,
  compact = false,
  className,
}: {
  files: File[]
  onChange: (files: File[]) => void
  onMetadata?: (metadata: PhotoMetadata) => void
  onError?: (message: string) => void
  /** Smaller zone and tiles, for a row in the observation register. */
  compact?: boolean
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const add = (chosen: File[]) => {
    const images = chosen.filter((file) => file.type.startsWith("image/"))
    const skipped = chosen.filter((file) => !file.type.startsWith("image/"))
    if (skipped.length > 0) {
      onError?.(`Bara bilder kan läggas till. Hoppade över: ${skipped.map((file) => file.name).join(", ")}.`)
    }
    if (images.length === 0) return
    onChange([...files, ...images])
    if (onMetadata) {
      readPhotoMetadata(images)
        .then((metadata) => {
          if (metadata.takenAt || metadata.lat !== undefined) onMetadata(metadata)
        })
        .catch(() => onError?.("Tid och position kunde inte läsas ur bilderna. Fyll i dem för hand."))
    }
  }

  return (
    <div className={twMerge("flex flex-col gap-2", className)}>
      {/* Same drop zone as the species list import (taxa/import-species-checklist-form.tsx). */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click()
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          add(Array.from(event.dataTransfer.files))
        }}
        className={twMerge(
          "flex cursor-pointer items-center justify-center rounded border border-dashed text-center transition-colors",
          compact ? "px-3 py-1.5 text-[10px] italic" : "px-5 py-4 text-sm",
          dragOver
            ? "border-accent bg-accent-wash text-accent"
            : "border-border bg-surface text-text-muted hover:border-accent hover:text-text",
        )}
      >
        {dragOver ? "Släpp bilderna här" : "Släpp bilder här eller välj"}
      </div>
      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}-${index}`}>
              <PhotoTile
                file={file}
                label={file.name}
                compact={compact}
                onRemove={() => onChange(files.filter((_, current) => current !== index))}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          add(Array.from(event.target.files ?? []))
          event.target.value = ""
        }}
        className="hidden"
      />
    </div>
  )
}

/** The observation's thumbnails; each opens the full image in the shared lightbox. Renders nothing without photos. */
export function ObservationPhotoList({
  photos,
  onRemove,
  className,
}: {
  photos: string[]
  onRemove?: (photo: string) => void
  className?: string
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  if (photos.length === 0) return null
  return (
    <>
      <ul className={twMerge("flex flex-wrap gap-2", className)}>
        {photos.map((photo, index) => (
          <li key={photo}>
            {/* The bucket is private, so files are streamed through /api/files. */}
            <PhotoTile
              src={fileProxyUrl(thumbnailPath(photo))}
              label={`Bild ${index + 1}`}
              onOpen={() => setLightboxIndex(index)}
              onRemove={onRemove ? () => onRemove(photo) : undefined}
            />
          </li>
        ))}
      </ul>
      {lightboxIndex !== null && lightboxIndex < photos.length ? (
        <Lightbox
          images={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      ) : null}
    </>
  )
}

/**
 * A square photo with the register's remove button (X) in its corner. A chosen
 * `file` is previewed through an object URL that lives as long as the image.
 */
function PhotoTile({
  src,
  file,
  onOpen,
  label,
  compact = false,
  onRemove,
}: {
  src?: string
  file?: File
  onOpen?: () => void
  label: string
  compact?: boolean
  onRemove?: () => void
}) {
  const showFile = useCallback((img: HTMLImageElement | null) => {
    if (!img || !file) return
    const url = URL.createObjectURL(file)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  const image = src || file ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} ref={showFile} alt={label} loading="lazy" decoding="async" className="size-full object-cover" />
  ) : null
  return (
    <div className={twMerge("relative overflow-hidden border border-border bg-surface-2", compact ? "size-12" : "size-24 sm:size-28")}>
      {onOpen ? (
        <button type="button" onClick={onOpen} aria-label={`Visa ${label}`} className="block size-full">
          {image}
        </button>
      ) : (
        image
      )}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Ta bort ${label}`}
          className="absolute right-0 top-0 flex size-6 items-center justify-center border-b border-l border-border bg-surface text-text-faint hover:bg-danger-wash hover:text-danger"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  )
}
