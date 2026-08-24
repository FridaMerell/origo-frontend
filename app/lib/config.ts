export const API_BASE_URL = process.env.ORIGO_API_URL ?? "http://api.origo.test:8000";

export const AUTH_ENDPOINTS = {
  csrf: "/api/accounts/csrf/",
  login: "/api/accounts/login/",
  logout: "/api/accounts/logout/",
  user: "/api/accounts/me/",
} as const;

export const SESSION_COOKIE = "origo_sessionid";
export const CSRF_COOKIE = "origo_csrftoken";

// Set to a shared parent domain (e.g. ".origo.test") so the session cookie
// is sent to every subdomain (verso, flux, ...). Leave unset to scope the
// cookie to the exact host that set it.
export const COOKIE_DOMAIN = process.env.ORIGO_COOKIE_DOMAIN || ".origo.test";
