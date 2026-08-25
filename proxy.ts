import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_BASE_URL, AUTH_ENDPOINTS, CSRF_COOKIE, SESSION_COOKIE } from "@/app/lib/config";
import { buildCookieHeader } from "@/app/lib/api-client";
import { resolveTenant } from "@/app/lib/tenant";

export async function proxy(request: NextRequest) {
  if (request.method !== "GET") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const tenant = resolveTenant(hostname);

  const isLoginRoute = pathname === "/login";
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;

  let hasValidSession = false;
  if (sessionId) {
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

  if (!isLoginRoute && !hasValidSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginRoute && hasValidSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (tenant && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `/${tenant}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico)$).*)"],
};
