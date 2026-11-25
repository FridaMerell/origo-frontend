import type { Metadata } from "next"
import type { FluxDesign } from "@/app/lib/dal/flux"
import { loadApiWorkbenchData } from "./api/api-data"

/**
 * Metadata for a page that belongs to the selected project as a whole, such as a "new record"
 * page. `describe` gets the project's name; `fallback` is used when there is no project.
 */
export async function modelProjectMetadata(
  describe: (projectName: string) => Metadata,
  fallback: Metadata,
): Promise<Metadata> {
  const data = await loadApiWorkbenchData()
  return data ? describe(data.projectName) : fallback
}

/**
 * Metadata for a page about one record in the selected project's design. `find` picks the
 * record out of the design, `describe` builds the title and description from it, and
 * `fallback` is used when there is no project or no such record.
 */
export async function modelRecordMetadata<T>(
  find: (design: FluxDesign) => T | undefined,
  describe: (record: T, design: FluxDesign) => Metadata,
  fallback: Metadata,
): Promise<Metadata> {
  const data = await loadApiWorkbenchData()
  if (!data) return fallback
  const record = find(data.design)
  return record ? describe(record, data.design) : fallback
}
