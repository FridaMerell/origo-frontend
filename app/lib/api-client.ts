import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { API_BASE_URL } from "@/app/lib/config";

function parseCookieValue(setCookieHeader: string): string {
  return setCookieHeader.split(";", 1)[0].split("=").slice(1).join("=");
}

export function extractSetCookie(response: Response, name: string): string | undefined {
  const cookies = response.headers.getSetCookie();
  const match = cookies.find((c) => c.startsWith(`${name}=`));
  return match ? parseCookieValue(match) : undefined;
}

export function buildCookieHeader(cookies: Record<string, string | undefined>): string {
  return Object.entries(cookies)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function resolveOrigin(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  return origin ?? (host ? `https://${host}` : undefined);
}

export async function fetchOrigoApi(path: string, init: RequestInit = {}) {
  const resolvedOrigin = await resolveOrigin();
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, ...(resolvedOrigin ? { Origin: resolvedOrigin } : {}) },
  });
}

/**
 * Builds a reader for public, user-independent endpoints: the request carries no
 * session, and its JSON is kept in Next's data cache and shared by every visitor
 * for `revalidate` seconds. A failed request is never cached; the reader then
 * returns null so the caller can fall back to a live, authenticated request.
 */
export function sharedOrigoJson(options: { revalidate: number; tags?: string[] }) {
  const read = unstable_cache(
    async (path: string, origin: string | undefined): Promise<unknown> => {
      const response = await fetch(`${API_BASE_URL}${path}`, { headers: origin ? { Origin: origin } : {} });
      if (!response.ok) throw new Error(`Origo API responded ${response.status}`);
      return response.json();
    },
    ["origo-shared-json"],
    options,
  );
  return async (path: string): Promise<unknown> => {
    const origin = await resolveOrigin();
    try {
      return await read(path, origin);
    } catch {
      return null;
    }
  };
}
