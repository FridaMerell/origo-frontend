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

export async function fetchOrigoApi(path: string, init: RequestInit = {}) {
  const host = (await headers()).get("host");
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, ...(host ? { Origin: `https://${host}` } : {}) },
  });
}
