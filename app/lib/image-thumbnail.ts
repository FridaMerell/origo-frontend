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

export type CompressOptions = {
  /** The encoded file never exceeds this. */
  maxBytes: number
  maxEdge: number
}

export type CompressedImage = {
  file: File
  width: number
  height: number
}

const COMPRESS_QUALITIES = [0.85, 0.75, 0.65]
const COMPRESS_STEPS = 8

/** Re-encodes an image as JPEG, lowering the quality and then the size until it fits in `maxBytes`. Browser only. */
export async function compressImage(file: File, { maxBytes, maxEdge }: CompressOptions, suffix = ""): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    const base = file.name.replace(/\.[^.]+$/, "") || "photo"
    const canvas = document.createElement("canvas")
    let scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    for (let step = 0; step < COMPRESS_STEPS; step++, scale *= 0.75) {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      for (const quality of COMPRESS_QUALITIES) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality)
        )
        if (!blob) throw new Error("Compression failed")
        if (blob.size <= maxBytes) {
          return {
            file: new File([blob], `${base}${suffix}.jpg`, { type: "image/jpeg" }),
            width: canvas.width,
            height: canvas.height,
          }
        }
      }
    }
    throw new Error("Image could not be compressed enough")
  } finally {
    bitmap.close()
  }
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
