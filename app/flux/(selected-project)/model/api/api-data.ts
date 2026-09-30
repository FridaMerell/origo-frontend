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

  const projects = await getFluxProjects()

  if (selectedProject && /^\d+$/.test(selectedProject)) {
    const design = await getFluxDesign(selectedProject)
    const projectName = projects.find((project) => String(project.id) === selectedProject)?.name ?? "Valt projekt"
    return design ? { projectId: selectedProject, projectName, design } : null
  }

  const project = projects[0]
  if (!project) return null
  const design = await getFluxDesign(String(project.id))
  return design ? { projectId: String(project.id), projectName: project.name, design } : null
}
