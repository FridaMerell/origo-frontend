"use server"

import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxRequest } from "@/app/flux/_actions/shared"
import type { FluxDocument, FluxScaffold, FluxScaffoldTarget } from "@/app/lib/dal"
import { getFluxScaffold } from "@/app/lib/dal/flux"

const targets: FluxScaffoldTarget[] = ["django", "typescript", "csharp", "design", "integration", "skeleton"]

export async function loadScaffold(
  projectId: string,
  target: FluxScaffoldTarget,
  files?: string[],
): Promise<FluxScaffold | null> {
  if (!/^\d+$/.test(projectId) || !targets.includes(target)) return null
  return getFluxScaffold(projectId, target, files)
}

export async function createScaffoldDocument(projectId: string, target: FluxScaffoldTarget) {
  if (!targets.includes(target)) return { error: "Okänt scaffold-target." }

  const { data, error } = await fluxRequest<FluxDocument>(
    FLUX_ENDPOINTS.projectScaffoldDocument(projectId),
    "POST",
    { target },
  )
  if (error) return { error }
  if (!data) return { error: "Scaffold-dokumentet kunde inte läsas tillbaka." }

  return { data: { id: data.id, title: data.title } }
}
