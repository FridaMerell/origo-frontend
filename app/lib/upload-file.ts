/** Uploads a file to the storage bucket through /api/upload and returns its URL. Browser only. */
export async function uploadFile(file: File, folder: "verso" | "flux" | "apsis" = "verso"): Promise<string> {
  const body = new FormData()
  body.set("file", file)
  body.set("folder", folder)
  const response = await fetch("/api/upload", { method: "POST", body })
  if (!response.ok) throw new Error("Upload failed")
  const { url } = (await response.json()) as { url: string }
  return url
}
