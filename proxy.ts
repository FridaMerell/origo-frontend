import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_BASE_URL, AUTH_ENDPOINTS, CSRF_COOKIE, SESSION_COOKIE } from "@/app/lib/config";
import { buildCookieHeader } from "@/app/lib/api-client";
import { isPublicPath, resolveTenant } from "@/app/lib/tenant";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const tenant = resolveTenant(hostname);
  const isLoginRoute = pathname === "/login";
  const isRootLanding = tenant === null && pathname === "/";
  // Routes a tenant has opted into serving without a session. "/login" is always
  // reachable; everything else stays gated unless the tenant lists it.
  const isPublicRoute = isLoginRoute || isRootLanding || (tenant !== null && isPublicPath(tenant, pathname));

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

    if (!isPublicRoute && !hasValidSession) {
      return NextResponse.redirect(new URL("/login", request.url));
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
  if (tenant) {
    const url = request.nextUrl.clone();
    url.pathname = `/${tenant}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico)$).*)"],
};
