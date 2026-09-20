import { S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 through its S3-compatible API. The bucket is private; files
// are only reachable through /api/files.
const accountId = process.env.R2_ACCOUNT_ID ?? "";

export const STORAGE_BUCKET = process.env.R2_BUCKET ?? "";
// Buckets created with a jurisdiction (e.g. "eu") live on a separate host.
const jurisdiction = process.env.R2_JURISDICTION ? `.${process.env.R2_JURISDICTION}` : "";

export const STORAGE_ENDPOINT = `https://${accountId}${jurisdiction}.r2.cloudflarestorage.com`;

export const storage = new S3Client({
  region: "auto",
  endpoint: STORAGE_ENDPOINT,
  // The bucket goes in the path, not the hostname (no TLS cert for the latter
  // on jurisdiction hosts).
  forcePathStyle: true,
  // Newer SDK versions add CRC32 checksum headers by default, which R2 rejects.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

// The reference stored in Django is the object's path-style S3 URL. It is
// never fetched directly (the bucket is private), it only identifies the key.
export function storageUrlForKey(key: string): string {
  return `${STORAGE_ENDPOINT}/${STORAGE_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function storageKeyFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const prefix = `/${STORAGE_BUCKET}/`;
  if (parsed.origin !== STORAGE_ENDPOINT || !parsed.pathname.startsWith(prefix)) return null;
  return decodeURIComponent(parsed.pathname.slice(prefix.length));
}
