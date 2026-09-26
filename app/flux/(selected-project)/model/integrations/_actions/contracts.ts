"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxRequest } from "@/app/flux/_actions/shared"

const endpoints = {
  integration: FLUX_ENDPOINTS.integrations,
  operation: FLUX_ENDPOINTS.integrationOperations,
} as const

export type IntegrationContractKind = keyof typeof endpoints

export async function saveIntegrationContract({ kind, id, payload }: { kind: IntegrationContractKind; id?: number; payload: Record<string, unknown> }) {
  const path = id ? `${endpoints[kind]}${id}/` : endpoints[kind]
  const { error } = await fluxRequest(path, id ? "PATCH" : "POST", payload)
  if (error) return { error }
  revalidatePath("/model")
  revalidatePath("/model/integrations")
  revalidatePath("/model/scaffold")
  return { success: true }
}
