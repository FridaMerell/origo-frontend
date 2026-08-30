export type FileLike = string | { [key: string]: unknown } | null | undefined

function extractFileUrl(file: FileLike): string | null {
  if (typeof file === "string") return file
  if (!file || typeof file !== "object") return null

  const candidateKeys = ["url", "file", "path", "href"] as const
  for (const key of candidateKeys) {
    const value = file[key]
    if (typeof value === "string" && value.trim()) return value
  }

  return null
}

export function normalizeFileUrls(files: FileLike[] = []): string[] {
  return files.map(extractFileUrl).filter((url): url is string => Boolean(url))
}

export function fileProxyUrl(url: string): string {
  return `/api/files?url=${encodeURIComponent(url)}`;
}
