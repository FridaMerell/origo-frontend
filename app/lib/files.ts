export function fileProxyUrl(url: string): string {
  return `/api/files?url=${encodeURIComponent(url)}`;
}
