import { cookies } from "next/headers";
import { COOKIE_DOMAIN, CSRF_COOKIE, SESSION_COOKIE } from "@/app/lib/config";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  domain: COOKIE_DOMAIN,
};

export async function getSessionCookies() {
  const cookieStore = await cookies();
  return {
    sessionId: cookieStore.get(SESSION_COOKIE)?.value,
    csrfToken: cookieStore.get(CSRF_COOKIE)?.value,
  };
}

export async function setSessionCookies(sessionId: string, csrfToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, cookieOptions);
  cookieStore.set(CSRF_COOKIE, csrfToken, cookieOptions);
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE, path: "/", domain: COOKIE_DOMAIN });
  cookieStore.delete({ name: CSRF_COOKIE, path: "/", domain: COOKIE_DOMAIN });
}
