import { cache } from "react"
import { cookies } from "next/headers"
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config"
import { getFluxBoard, getFluxProjects } from "@/app/lib/dal"

/** The project the /model pages operate on: the selected project, else the first one.
 *  getFluxBoard is request-cached, so this reuses the Flux layout's fetch. */
export const getModelProjectId = cache(async (): Promise<number | null> => {
  const cookieStore = await cookies()
  const selectedId = cookieStore.get(FLUX_PROJECT_COOKIE)?.value
  let board = selectedId ? await getFluxBoard(selectedId) : null
  if (!board) {
    const [firstProject] = await getFluxProjects()
    board = firstProject ? await getFluxBoard(String(firstProject.id)) : null
  }
  return board?.project.id ?? null
})
