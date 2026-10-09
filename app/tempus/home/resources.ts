import type { TempusPage, TempusSeasonalLandscape, TempusSeasonalOverview } from "@/app/lib/dal"
import type { Selection } from "./selection"

// The reads the start page is made of. The server and the browser describe a
// read the same way, so what the server has already fetched is recognised by
// the browser and not fetched again.
export type OverviewPage = TempusPage<TempusSeasonalOverview>

export type OverviewResource<T> = {
  endpoint: "seasonal-overview" | "seasonal-landscapes"
  query: Record<string, string | number | boolean>
  // The same for every visitor (a count, a sample), so the cached anonymous read serves it.
  shared: boolean
  // What a failed read counts as.
  empty: T
}

// Species with fewer reports in the area are left out of the selection.
export const MIN_RECORDS = 20
// Rows on one page of the register.
export const REGISTER_PAGE_SIZE = 24
// Rows on one page of "snart i säsong" and "snart ur säsong".
export const WINDOW_PAGE_SIZE = 3
// How far ahead those two lists look.
export const WINDOW_DAYS = 21

const EMPTY_PAGE: OverviewPage = { results: [], count: 0, next: null, previous: null }
const EVERY_STATUS = "coming_into_season,at_peak,in_season,going_out_of_season,out_of_season"

export function overviewResources(geoAreaId: string | null) {
  const area = { ...(geoAreaId ? { geo_area: geoAreaId } : {}), min_records: MIN_RECORDS }
  const page = (query: OverviewResource<OverviewPage>["query"], shared = false): OverviewResource<OverviewPage> => ({
    endpoint: "seasonal-overview",
    query: { ...area, ...query },
    shared,
    empty: EMPTY_PAGE,
  })
  // One page of the current species, most interesting first; narrowed to a landscape type if one is given.
  const register = (landscapeType: string | null, pageNumber: number) =>
    page({ ...(landscapeType ? { landscape_type: landscapeType } : {}), page: pageNumber, page_size: REGISTER_PAGE_SIZE })

  return {
    register,
    followed: () => page({ is_followed: true, page_size: 100 }),
    incoming: (pageNumber: number) => page({ status: "coming_into_season", page: pageNumber, page_size: WINDOW_PAGE_SIZE }),
    outgoing: (pageNumber: number) => page({ status: "going_out_of_season", page: pageNumber, page_size: WINDOW_PAGE_SIZE }),
    // Only the count is used: every species with a phenogram, whatever its status.
    total: () => page({ status: EVERY_STATUS, page_size: 1 }, true),
    // Only the count is used: every current species in the area. The unnarrowed
    // register carries that count, so while it is the list on screen this is
    // the same read and costs nothing; otherwise it is the list's first page.
    currentCount: (selection: Selection) =>
      register(null, selection.mode === "list" && !selection.landscapeType ? selection.page : 1),
    // The area's most current species. The biotope map is chosen from it.
    sample: () => page({ page: 1, page_size: 50 }, true),
    landscapes: (): OverviewResource<TempusSeasonalLandscape[]> => ({
      endpoint: "seasonal-landscapes",
      query: { ...area, limit: 3 },
      shared: true,
      empty: [],
    }),
  }
}

export type OverviewResources = ReturnType<typeof overviewResources>

export function resourceKey(resource: OverviewResource<unknown>): string {
  const query = Object.entries(resource.query)
    .map(([name, value]) => `${name}=${value}`)
    .sort()
    .join("&")
  return `${resource.endpoint}?${query}${resource.shared ? "#shared" : ""}`
}

// The reads a selection shows straight away, for the server to send along with
// the page. Keep it in step with what `useHomeData` reads.
export function resourcesFor(selection: Selection, resources: OverviewResources): OverviewResource<unknown>[] {
  if (selection.view === "followed") return [resources.followed()]
  return [
    resources.total(),
    resources.sample(),
    resources.currentCount(selection),
    resources.incoming(selection.incomingPage),
    resources.outgoing(selection.outgoingPage),
    selection.mode === "landscape" ? resources.landscapes() : resources.register(selection.landscapeType, selection.page),
  ]
}
