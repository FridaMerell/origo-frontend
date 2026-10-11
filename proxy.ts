import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_BASE_URL, AUTH_ENDPOINTS, COOKIE_DOMAIN, CSRF_COOKIE, SESSION_COOKIE } from "@/app/lib/config";
import { buildCookieHeader } from "@/app/lib/api-client";
import { isPublicPath, resolveTenant } from "@/app/lib/tenant";

const DJANGO_SESSION_COOKIE = "sessionid";
const DJANGO_CSRF_COOKIE = "csrftoken";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const tenant = resolveTenant(hostname);
  const isLoginRoute = pathname === "/login";
  const isRootLanding = tenant === null && pathname === "/";
  // The house-invitation landing page. Reachable without a session (it can create
  // an account) and host-agnostic, so it is never gated or rewritten to a tenant.
  const isJoinRoute = pathname === "/join";
  // Routes a tenant has opted into serving without a session. "/login" is always
  // reachable; everything else stays gated unless the tenant lists it.
  // The "about" page is public and host-agnostic too, like the join route.
  const isAboutRoute = pathname === "/om";
  const isPublicRoute =
    isLoginRoute ||
    isRootLanding ||
    isJoinRoute ||
    isAboutRoute ||
    (tenant !== null && isPublicPath(tenant, pathname));

  let validSessionId: string | undefined;

  if (request.method === "GET") {
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value;

    // A public route with no session cookie can't be signed in and won't be
    // redirected — skip the round-trip to the auth API entirely.
    let hasValidSession = false;
    if (sessionId && !(isPublicRoute && !isLoginRoute)) {
      const csrfToken = request.cookies.get(CSRF_COOKIE)?.value;
      try {
        const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.user}`, {
          headers: {
            Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
          },
        });
        hasValidSession = response.ok;
      } catch {
        hasValidSession = false;
      }
    }
    if (hasValidSession) validSessionId = sessionId;

    if (!isPublicRoute && !hasValidSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set(
        "redirect",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(loginUrl);
    }

    if (isLoginRoute && hasValidSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Server Actions POST back to the page's own (tenant-stripped) URL, so the
  // rewrite below has to apply to every method, not just GET — otherwise a
  // mutation submitted from e.g. "/projects" never resolves to the real
  // "/flux/projects" route and 404s, even though the action itself ran.
  //
  // "/login" is rewritten too (not skipped), so it resolves to the
  // tenant-specific "/flux/login" or "/verso/login" page instead of always
  // falling through to the generic "/login" page.
  let response = NextResponse.next();
  if (tenant && !isJoinRoute && !isAboutRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `/${tenant}${pathname === "/" ? "" : pathname}`;
    response = NextResponse.rewrite(url);
  }

  // Browser-to-API requests (BirdNET SSE, flux board) go straight to Django,
  // which only reads its own cookie names. Login writes those, but a session
  // that predates that — or a browser that never got them — only carries the
  // origo_* pair, so the stream is rejected. Mirror them for any valid session.
  if (validSessionId && request.cookies.get(DJANGO_SESSION_COOKIE)?.value !== validSessionId) {
    const parent = COOKIE_DOMAIN.replace(/^\./, "");
    const shared = hostname === parent || hostname.endsWith(`.${parent}`);
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      ...(shared ? { domain: COOKIE_DOMAIN } : {}),
    };
    response.cookies.set(DJANGO_SESSION_COOKIE, validSessionId, options);
    const csrfToken = request.cookies.get(CSRF_COOKIE)?.value;
    if (csrfToken) response.cookies.set(DJANGO_CSRF_COOKIE, csrfToken, options);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|manifest\\.webmanifest$|sw\\.js$|.*\\.(?:png|svg|ico)$).*)"],
};
