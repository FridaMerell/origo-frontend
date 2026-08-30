export const API_BASE_URL = process.env.ORIGO_API_URL ?? "http://api.origo.test:8000";
export const ORIGO_VERSION = process.env.NEXT_PUBLIC_ORIGO_VERSION ?? "0.0.1";

// Google Maps JavaScript API key. Inlined into the client bundle at build time,
// so restrict it by HTTP referrer in the Google Cloud console.
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

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

// BirdNET acoustic detections. The detection stream sits *outside* the
// /api/tempus/ prefix; device management stays under TEMPUS_ENDPOINTS.
export const BIRDNET_ENDPOINTS = {
  detectionStream: "/api/birdnet/detections/stream",
} as const;

// Same-origin path the browser opens with EventSource. The route handler at
// app/api/birdnet/stream/route.ts proxies it to BIRDNET_ENDPOINTS.detectionStream
// with the session cookie attached server-side.
export const BIRDNET_STREAM_PATH = "/api/birdnet/stream";

export const APSIS_ENDPOINTS = {
  posts: "/api/apsis/posts/",
} as const;

export const TEMPUS_ENDPOINTS = {
  birdnetDevices: "/api/tempus/birdnet-devices/",
  checklists: "/api/tempus/checklists/",
  checklistItems: "/api/tempus/checklist-items/",
  observations: "/api/tempus/observations/",
  geoAreas: "/api/tempus/geo-areas/",
  speciesFollow: "/api/tempus/species-follows/",
  species: "/api/tempus/species/",
  speciesSeasonalOverview: "/api/tempus/species/seasonal-overview/",
  speciesImportChecklist: "/api/tempus/species/import-checklist/",
  speciesRegister: "/api/tempus/species/register/",
  speciesSearch: "/api/tempus/species/search/",
  speciesCategories: "/api/tempus/species-categories/",
  speciesPhenogram: (id: string) => `/api/tempus/species/${id}/phenogram/`,
  routes: "/api/tempus/routes/",
  routeStops: "/api/tempus/route-stops/",
  routeSuggestedStops: (id: string) => `/api/tempus/routes/${id}/suggested-stops/`,
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
