const THUMBNAIL_MAX_EDGE = 480
const THUMBNAIL_QUALITY = 0.8

export type ImageInfo = {
  width: number
  height: number
  thumbnail: File
}

/** Reads an image's size and makes a small JPEG thumbnail. Browser only. */
export async function readImageInfo(file: File): Promise<ImageInfo> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    const scale = Math.min(1, THUMBNAIL_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", THUMBNAIL_QUALITY)
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
