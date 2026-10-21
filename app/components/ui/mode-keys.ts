// Where each app keeps the visitor's light/dark choice: localStorage and a
// cookie of this name. Layouts read the cookie on the server (see
// readStoredMode in app/lib/color-mode.ts); the shells write both.
export const MODE_KEYS = {
  tempus: "tempus-mode",
  apsis: "apsis-mode",
  flux: "flux-mode",
  opus: "opus-mode",
} as const
