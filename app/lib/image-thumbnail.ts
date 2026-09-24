const THUMBNAIL_MAX_EDGE = 480
const THUMBNAIL_QUALITY = 0.8

export type ThumbnailOptions = {
  maxEdge?: number
  quality?: number
}

export type ImageInfo = {
  width: number
  height: number
  thumbnail: File
}

/** Reads an image's size and makes a JPEG thumbnail. Browser only. */
export async function readImageInfo(file: File, options: ThumbnailOptions = {}): Promise<ImageInfo> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    const maxEdge = options.maxEdge ?? THUMBNAIL_MAX_EDGE
    const quality = options.quality ?? THUMBNAIL_QUALITY
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    )
    if (!blob) throw new Error("Thumbnail failed")

    const base = file.name.replace(/\.[^.]+$/, "") || "photo"
    return {
      width: bitmap.width,
      height: bitmap.height,
      thumbnail: new File([blob], `${base}-thumb.jpg`, { type: "image/jpeg" }),
    }
  } finally {
    bitmap.close()
  }
}
