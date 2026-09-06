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

function shouldLogChecklistRequest(path: string) {
  const url = new URL(path, "https://origo.local")
  return [
    /^\/api\/accounts\/(?:csrf|self)\/$/,
    /^\/api\/tempus\/checklists\//,
    /^\/api\/tempus\/checklist-items\//,
    /^\/api\/tempus\/observations\//,
    /^\/api\/tempus\/species\//,
    /^\/api\/tempus\/species-categories\//,
  ].some((pattern) => pattern.test(url.pathname))
}

export async function fetchOrigoApi(path: string, init: RequestInit = {}) {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  const resolvedOrigin = origin ?? (host ? `https://${host}` : undefined);
  const url = `${API_BASE_URL}${path}`
  const logTiming = shouldLogChecklistRequest(path)
  const started = logTiming ? performance.now() : 0
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, ...(resolvedOrigin ? { Origin: resolvedOrigin } : {}) },
  });

  if (logTiming) {
    const headersMs = performance.now() - started
    const bodyStarted = performance.now()
    void response.clone().json().catch(() => undefined).then(() => {
      const bodyMs = performance.now() - bodyStarted
      console.log({
        endpoint: new URL(url).pathname,
        status: response.status,
        headersMs: Math.round(headersMs),
        bodyMs: Math.round(bodyMs),
        bytes: response.headers.get("content-length"),
        region: process.env.VERCEL_REGION,
      })
    })
  }

  return response
}
