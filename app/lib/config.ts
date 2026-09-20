export const API_BASE_URL = process.env.ORIGO_API_URL ?? "http://api.origo.test:8000";
// Public API origin for browser-to-API requests. This is intentionally limited
// to the base URL: authentication continues through the shared session cookie.
export const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_ORIGO_API_URL ?? "http://api.origo.test:8000";

// Browser-to-API URL. In dev (API on an explicit port) this uses the page's own
// hostname on the API port: cookies ignore ports, so the session cookie is sent
// even in browsers (Firefox, mobile) that withhold it from api.<host>.
// Server-side, or with a default port (production), the URL is returned as is.
export function browserApiUrl(path: string): URL {
  const url = new URL(path, PUBLIC_API_BASE_URL);
  if (typeof window === "undefined" || !url.port) return url;
  const pageHost = window.location.hostname;
  const parentHost = url.hostname.replace(/^api\./, "");
  if (url.hostname !== pageHost && pageHost.endsWith(parentHost)) url.hostname = pageHost;
  return url;
}
export const ORIGO_VERSION = process.env.NEXT_PUBLIC_ORIGO_VERSION ?? "0.0.1";

// Google Maps JavaScript API key. Inlined into the client bundle at build time,
// so restrict it by HTTP referrer in the Google Cloud console.
export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export const AUTH_ENDPOINTS = {
  csrf: "/api/accounts/csrf/",
  login: "/api/accounts/login/",
  logout: "/api/accounts/logout/",
  user: "/api/accounts/self/",
  profile: (id: number | string) => `/api/accounts/self/${encodeURIComponent(id)}/`,
  setPassword: "/api/accounts/self/set-password/",
} as const;

export const ACCOUNTS_ENDPOINTS = {
  users: "/api/accounts/users/",
  selfToken: "/api/accounts/self/token/",
  invitations: "/api/accounts/invitations/",
  invitation: (id: string) => `/api/accounts/invitations/${encodeURIComponent(id)}/`,
  redeemInvitation: "/api/accounts/invitations/redeem/",
  notifications: "/api/accounts/notifications/",
  notification: (id: string) => `/api/accounts/notifications/${encodeURIComponent(id)}/`,
  notificationsSummary: "/api/accounts/notifications/summary/",
  notificationRead: (id: string) => `/api/accounts/notifications/${encodeURIComponent(id)}/read/`,
  notificationsReadAll: "/api/accounts/notifications/read-all/",
  pushSubscriptions: "/api/accounts/push-subscriptions/",
  pushTest: "/api/accounts/push-subscriptions/test/",
} as const;

export const VERSO_ENDPOINTS = {
  facilities: "/api/verso/houses/",
  facility: (id: string) => `/api/verso/houses/${encodeURIComponent(id)}/`,
  dashboard: "/api/verso/houses/dashboard/",
  bookings: "/api/verso/bookings/",
  bookingRequests: "/api/verso/booking-requests/",
  checkOuts: "/api/verso/check-outs/",
  ventures: "/api/verso/ventures/",
  ventureTasks: "/api/verso/venture-tasks/",
  expenses: "/api/verso/expenses/",
  yearlyExpenses: "/api/verso/expenses/year_expenses/",
  versoUpdates: "/api/verso/updates/",
  drawings: "/api/verso/drawings/",
  drawingPages: "/api/verso/drawing-pages/",
  photos: "/api/verso/photos/",
  albums: "/api/verso/albums/",
  photoTags: "/api/verso/photo-tags/",
  people: "/api/verso/people/",
  personRelations: "/api/verso/person-relations/",
  documents: "/api/verso/documents/",
  onThisDay: "/api/verso/houses/on_this_day/",
  historyEvents: "/api/verso/history-events/",
} as const;

export const FLUX_ENDPOINTS = {
  projects: "/api/flux/projects/",
  timeline: "/api/flux/timeline/",
  projectBoard: (id: string) => `/api/flux/projects/${encodeURIComponent(id)}/board/`,
  milestones: "/api/flux/milestones/",
  tasks: "/api/flux/tasks/",
  updates: "/api/flux/updates/",
  documents: "/api/flux/documents/",
  entities: "/api/flux/entities/",
  fields: "/api/flux/fields/",
  relations: "/api/flux/relations/",
  stackProfiles: "/api/flux/stack-profiles/",
  resources: "/api/flux/resources/",
  roles: "/api/flux/roles/",
  rolePermissions: "/api/flux/role-permissions/",
  screens: "/api/flux/screens/",
  integrations: "/api/flux/integrations/",
  seedRows: "/api/flux/seed-rows/",
  identities: "/api/flux/identities/",
  projectScaffold: (id: number | string) => `/api/flux/projects/${encodeURIComponent(String(id))}/scaffold/`,
  projectScaffoldDocument: (id: number | string) => `/api/flux/projects/${encodeURIComponent(String(id))}/scaffold-document/`,
  projectGenerateTasks: (id: number | string) => `/api/flux/projects/${encodeURIComponent(String(id))}/generate-tasks/`,
} as const;

// BirdNET acoustic detections. The detection stream sits *outside* the
// /api/tempus/ prefix; device management stays under TEMPUS_ENDPOINTS.
export const BIRDNET_ENDPOINTS = {
  detectionStream: "/api/birdnet/detections/stream",
} as const;

// Browser-facing URL for the direct BirdNET SSE connection. The API and
// frontend share a parent domain, so EventSource sends the session cookie to
// the API without a Next.js proxy.
export const BIRDNET_STREAM_URL = new URL(
  BIRDNET_ENDPOINTS.detectionStream,
  PUBLIC_API_BASE_URL
).toString();

export const APSIS_ENDPOINTS = {
  posts: "/api/apsis/posts/",
} as const;

export const TEMPUS_ENDPOINTS = {
  countryOverview: "/api/tempus/country-overview/",
  landCover: "/api/tempus/land-cover/",
  administrativeBoundaries: "/api/tempus/administrative-boundaries/",
  birdnetDevices: "/api/tempus/birdnet-devices/",
  checklists: "/api/tempus/checklists/",
  checklistRegister: (id: string) => `/api/tempus/checklists/${id}/register/`,
  checklistSyncCategory: (id: string) => `/api/tempus/checklists/${id}/sync-category/`,
  checklistItems: "/api/tempus/checklist-items/",
  observations: "/api/tempus/observations/",
  observationsByCategory: "/api/tempus/observations/by-category/",
  observationsSyncChecklists: "/api/tempus/observations/sync-checklists/",
  geoAreas: "/api/tempus/geo-areas/",
  locales:"/api/tempus/locales/",
  localeLandCover: (id: number | string) => `/api/tempus/locales/${encodeURIComponent(id)}/land-cover/`,
  localeLandCoverMap: (id: number | string) => `/api/tempus/locales/${encodeURIComponent(id)}/land-cover/map/`,
  localeLandCoverFetch: (id: number | string) => `/api/tempus/locales/${encodeURIComponent(id)}/land-cover/fetch/`,
  localeAdministrativeBoundaries: (id: number | string) => `/api/tempus/locales/${encodeURIComponent(id)}/administrative-boundaries/`,
  speciesFollow: "/api/tempus/species-follows/",
  speciesFollowsMine: "/api/tempus/species-follows/my_follows/",
  speciesFollowItem: (id: string) => `/api/tempus/species-follows/${encodeURIComponent(id)}/`,
  speciesUnfollow: (taxonId: string) =>
    `/api/tempus/species-follows/unfollow/?species=${encodeURIComponent(taxonId)}`,
  species: "/api/tempus/species/",
  speciesResolve: "/api/tempus/species/resolve/",
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
export const VERSO_MODE_COOKIE = "verso_mode";
export const FLUX_PROJECT_COOKIE = "flux_project";
export const TEMPUS_GEO_AREA_COOKIE = "tempus_geo_area";
export const TEMPUS_ALL_SWEDEN = "__all_sweden__";

// Set to a shared parent domain (e.g. ".origo.test") so the session cookie
// is sent to every subdomain (verso, flux, ...). Leave unset to scope the
// cookie to the exact host that set it.
export const COOKIE_DOMAIN = process.env.ORIGO_COOKIE_DOMAIN || ".origo.test";
