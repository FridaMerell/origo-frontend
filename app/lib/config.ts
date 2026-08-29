export const API_BASE_URL = process.env.ORIGO_API_URL ?? "http://api.origo.test:8000";
export const ORIGO_VERSION = process.env.NEXT_PUBLIC_ORIGO_VERSION ?? "0.0.1";

export const AUTH_ENDPOINTS = {
  csrf: "/api/accounts/csrf/",
  login: "/api/accounts/login/",
  logout: "/api/accounts/logout/",
  user: "/api/accounts/self/",
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
  yearlyExpenses: "/api/verso/expenses/year_expenses/",
  versoUpdates: "/api/verso/updates/",
} as const;

export const FLUX_ENDPOINTS = {
  projects: "/api/flux/projects/",
  milestones: "/api/flux/milestones/",
  tasks: "/api/flux/tasks/",
  updates: "/api/flux/updates/",
} as const;

export const APSIS_ENDPOINTS = {
  posts: "/api/apsis/posts/",
} as const;

export const TEMPUS_ENDPOINTS = {
  checklists: "/api/tempus/checklists/",
  checklistItems: "/api/tempus/checklist-items/",
  observations: "/api/tempus/observations/",
  geoAreas: "/api/tempus/geo-areas/",
  speciesFollow: "/api/tempus/species-follows/",
  species: "/api/tempus/species/",
  speciesRegister: "/api/tempus/species/register/",
  speciesSearch: "/api/tempus/species/search/",
  speciesCategories: "/api/tempus/species-categories/",
  speciesPhenogram: (id: string) => `/api/tempus/species/${id}/phenogram/`,
} as const;

export const SESSION_COOKIE = "origo_sessionid";
export const CSRF_COOKIE = "origo_csrftoken";
export const FACILITY_COOKIE = "verso_facility";
export const FLUX_PROJECT_COOKIE = "flux_project";
export const TEMPUS_GEO_AREA_COOKIE = "tempus_geo_area";
export const TEMPUS_ALL_SWEDEN = "__all_sweden__";

// Set to a shared parent domain (e.g. ".origo.test") so the session cookie
// is sent to every subdomain (verso, flux, ...). Leave unset to scope the
// cookie to the exact host that set it.
export const COOKIE_DOMAIN = process.env.ORIGO_COOKIE_DOMAIN || ".origo.test";
