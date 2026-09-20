"use client"

import { useRef, useState } from "react"
import { ImageIcon, Loader, Upload } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { fileProxyUrl } from "@/app/lib/files"
import { safeUploadName } from "./identity-utils"

export const ASSET_ACCEPT = "image/svg+xml,image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,.svg,.png,.jpg,.jpeg,.webp,.gif,.ico"
const MAX_BYTES = 5 * 1024 * 1024

/** The file name shown to people: the last path segment, without the unique id the upload adds. */
export function assetFileLabel(url: string): string {
  const last = url.split("?")[0].split("/").pop() ?? url
  let decoded = last
  try {
    decoded = decodeURIComponent(last)
  } catch {
    // keep the raw segment
  }
  return decoded.replace(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[^.]+$|$)/i, "")
}

/**
 * Uploaded files sit in a private bucket and are shown through the session-checked proxy. Links to
 * other hosts (older assets) and root-relative files are shown as they are.
 */
export function AssetThumbnail({ url }: { url: string }) {
  const [directOnly, setDirectOnly] = useState(url.startsWith("/"))
  // eslint-disable-next-line @next/next/no-img-element
  return <img key={url} src={directOnly ? url : fileProxyUrl(url)} alt="" onError={() => setDirectOnly(true)} className="max-h-full max-w-full object-contain" />
}

export function AssetFileField({
  url,
  error,
  onUploaded,
}: {
  url: string
  error?: string
  onUploaded: (file: { url: string; name: string }) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      setProblem("Filen är för stor. Högst 5 MB.")
      return
    }
    setUploading(true)
    setProblem(null)
    try {
      // The stored reference must satisfy the identity address rules, so the name is cleaned first.
      const body = new FormData()
      body.set("file", new File([file], safeUploadName(file.name), { type: file.type }))
      body.set("folder", "flux")
      const response = await fetch("/api/upload", { method: "POST", body })
      if (!response.ok) throw new Error("Upload failed")
      const uploaded = (await response.json()) as { url: string }
      onUploaded({ url: uploaded.url, name: file.name.replace(/\.[^.]+$/, "") })
    } catch {
      setProblem("Uppladdningen misslyckades. Försök igen.")
    } finally {
      setUploading(false)
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ASSET_ACCEPT}
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) void upload(file)
        event.target.value = ""
      }}
    />
  )

  return (
    <div className="flex flex-col gap-1 text-sm text-text-muted">
      Fil
      {url ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-bg p-2">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-surface-2">
            <AssetThumbnail url={url} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-text" title={url}>{assetFileLabel(url)}</span>
            {!/\/flux\//.test(url) && <span className="text-xs text-text-faint">Länk sparad tidigare. Ladda upp en fil för att ersätta den.</span>}
          </span>
          <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
            Byt fil
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-5 text-sm transition-colors hover:border-accent-hover hover:text-text disabled:opacity-60"
        >
          {uploading ? <Loader size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          {uploading ? "Laddar upp…" : "Ladda upp fil (svg, png, jpg, webp, ico, högst 5 MB)"}
        </button>
      )}
      {input}
      {(problem || error) && <span className="text-xs text-danger">{problem ?? error}</span>}
    </div>
  )
}
