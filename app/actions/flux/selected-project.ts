"use server"

import { cookies } from "next/headers"
import { FLUX_PROJECT_COOKIE } from "@/app/lib/config"
import { getFluxBoard, getFluxProjects, type FluxBoard } from "@/app/lib/dal"

export type SelectFluxProjectState = {
  error?: string
  board?: FluxBoard
}

export async function selectFluxProject(id: string): Promise<SelectFluxProjectState> {
  const projects = await getFluxProjects()
  const project = projects.find((item) => String(item.id) === id)
  if (!project) return { error: "Projektet kunde inte hittas." }

  const board = await getFluxBoard(String(project.id))
  if (!board) return { error: "Projektets innehåll kunde inte hämtas." }

  const cookieStore = await cookies()
  cookieStore.set(FLUX_PROJECT_COOKIE, String(project.id), {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  })

  return { board }
}
