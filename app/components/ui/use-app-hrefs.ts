import { useSyncExternalStore } from "react"
import { APP_LINKS, appHref } from "@/app/lib/tenant-links"

/** Keyed by app id. */
type AppHrefs = Record<string, string>

const NO_HREFS: AppHrefs = {}
let hrefs: AppHrefs | null = null

// The links depend only on the page's host, which never changes while it is open.
const subscribe = () => () => {}

function getHrefs() {
  hrefs ??= Object.fromEntries(APP_LINKS.map((app) => [app.id, appHref(app.id)]))
  return hrefs
}

/**
 * Each app's address on the current host. The server and the first client
 * render get none (the host is only known in the browser), then all of them.
 */
export function useAppHrefs() {
  return useSyncExternalStore(subscribe, getHrefs, () => NO_HREFS)
}
