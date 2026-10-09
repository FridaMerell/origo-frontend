import { getTempusSeasonalLandscapes, getTempusSeasonalOverviewPage } from "@/app/lib/dal/tempus/species"
import { resourceKey, resourcesFor, type OverviewResource, type OverviewResources } from "./resources"
import type { Selection } from "./selection"

// Reads fetched on the server, by their key, for the provider to start from.
export type OverviewSeed = [key: string, data: unknown][]

function readResource(resource: OverviewResource<unknown>): Promise<unknown> {
  return resource.endpoint === "seasonal-landscapes"
    ? getTempusSeasonalLandscapes(resource.query)
    : getTempusSeasonalOverviewPage(resource.query, { shared: resource.shared })
}

export async function readSeed(selection: Selection, resources: OverviewResources): Promise<OverviewSeed> {
  // Two of a selection's reads can be one and the same; each is fetched once.
  const needed = new Map(resourcesFor(selection, resources).map((resource) => [resourceKey(resource), resource]))
  return Promise.all([...needed].map(async ([key, resource]) => [key, await readResource(resource)] as [string, unknown]))
}
