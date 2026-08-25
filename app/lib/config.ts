export const API_BASE_URL = process.env.ORIGO_API_URL ?? "http://api.origo.test:8000";
export const ORIGO_VERSION = process.env.ORIGO_VERSION ?? "0.0.0";

export const AUTH_ENDPOINTS = {
  csrf: "/api/accounts/csrf/",
  login: "/api/accounts/login/",
  logout: "/api/accounts/logout/",
  user: "/api/accounts/me/",
} as const;

export const ACCOUNTS_ENDPOINTS = {
  users: "/api/accounts/users/",
} as const;

export const VERSO_ENDPOINTS = {
  facilities: "/api/verso/houses/",
  bookings: "/api/verso/bookings/",
  bookingRequests: "/api/verso/booking-requests/",
  checkOuts: "/api/verso/check-outs/",
  ventures: "/api/verso/ventures/",
  ventureTasks: "/api/verso/venture-tasks/",
  expenses: "/api/verso/expenses/",
} as const;

export const FLUX_ENDPOINTS = {
  projects: "/api/flux/projects/",
  milestones: "/api/flux/milestones/",
  tasks: "/api/flux/tasks/",
  updates: "/api/flux/updates/",
} as const;

export const SESSION_COOKIE = "origo_sessionid";
export const CSRF_COOKIE = "origo_csrftoken";
export const FACILITY_COOKIE = "verso_facility";

// Set to a shared parent domain (e.g. ".origo.test") so the session cookie
// is sent to every subdomain (verso, flux, ...). Leave unset to scope the
// cookie to the exact host that set it.
export const COOKIE_DOMAIN = process.env.ORIGO_COOKIE_DOMAIN || ".origo.test";
