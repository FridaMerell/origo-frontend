import { cookies } from "next/headers"
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config"
import { getFluxDesign, getFluxProjects, type FluxDesign } from "@/app/lib/dal/flux"

export type ApiWorkbenchData = {
  projectId: string
  projectName: string
  design: FluxDesign
}

export async function loadApiWorkbenchData(): Promise<ApiWorkbenchData | null> {
  const selectedProject = (await cookies()).get(FLUX_PROJECT_COOKIE)?.value

  if (selectedProject && /^\d+$/.test(selectedProject)) {
    const design = await getFluxDesign(selectedProject)
    return design ? { projectId: selectedProject, projectName: "Valt projekt", design } : null
  }

  const project = (await getFluxProjects())[0]
  if (!project) return null
  const design = await getFluxDesign(String(project.id))
  return design ? { projectId: String(project.id), projectName: project.name, design } : null
}
