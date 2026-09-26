"use server"

import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxRequest } from "@/app/flux/_actions/shared"
import type { FluxDocument, FluxScaffoldTarget } from "@/app/lib/dal"

const targets: FluxScaffoldTarget[] = ["django", "typescript", "csharp", "design", "integration", "skeleton"]

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
