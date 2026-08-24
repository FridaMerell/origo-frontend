import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/app/lib/config";
import { resolveTenant } from "@/app/lib/tenant";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const tenant = resolveTenant(hostname);

  const isLoginRoute = pathname === "/login";
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isLoginRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoginRoute && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

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
