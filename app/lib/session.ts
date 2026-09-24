import { cookies } from "next/headers";
import { COOKIE_DOMAIN, CSRF_COOKIE, SESSION_COOKIE } from "@/app/lib/config";

const DJANGO_SESSION_COOKIE = "sessionid";
const DJANGO_CSRF_COOKIE = "csrftoken";

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
    sessionId: cookieStore.get(SESSION_COOKIE)?.value ?? cookieStore.get(DJANGO_SESSION_COOKIE)?.value,
    csrfToken: cookieStore.get(CSRF_COOKIE)?.value ?? cookieStore.get(DJANGO_CSRF_COOKIE)?.value,
  };
}

export async function setSessionCookies(sessionId: string, csrfToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, cookieOptions);
  cookieStore.set(CSRF_COOKIE, csrfToken, cookieOptions);
  // Browser-to-API requests (BirdNET SSE, flux board) send cookies straight to
  // Django, which only recognises its own cookie name.
  cookieStore.set(DJANGO_SESSION_COOKIE, sessionId, cookieOptions);
  cookieStore.set(DJANGO_CSRF_COOKIE, csrfToken, cookieOptions);
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  cookieStore.set(CSRF_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  cookieStore.set(DJANGO_SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  cookieStore.set(DJANGO_CSRF_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}
