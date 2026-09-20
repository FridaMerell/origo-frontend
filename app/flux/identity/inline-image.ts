import { fileProxyUrl } from "@/app/lib/files"

const MIME_BY_EXTENSION: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  ico: "image/x-icon",
}

const MAX_BYTES = 5 * 1024 * 1024

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * An asset as a data URL, for the sandboxed preview frame that cannot send the session cookie.
 * Uploaded files are fetched through the session-checked proxy; a root-relative file is fetched
 * directly. Returns null when it cannot be read as a reasonably small image (the caller then falls
 * back to the plain address, which works for public links).
 */
export async function loadInlineImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url.startsWith("/") ? url : fileProxyUrl(url))
    if (!response.ok) return null
    const blob = await response.blob()
    if (blob.size > MAX_BYTES) return null

    const extension = url.split("?")[0].split(".").pop()?.toLowerCase() ?? ""
    // Storage may serve a generic type; trust the extension so the browser draws it as an image.
    const type = blob.type.startsWith("image/") ? blob.type : MIME_BY_EXTENSION[extension]
    if (!type) return null
    return await readAsDataUrl(new Blob([blob], { type }))
  } catch {
    return null
  }
}
