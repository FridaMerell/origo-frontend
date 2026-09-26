"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxRequest } from "@/app/flux/_actions/shared"

const endpoints = {
  entity: FLUX_ENDPOINTS.entities,
  field: FLUX_ENDPOINTS.fields,
  relation: FLUX_ENDPOINTS.relations,
} as const

export type DomainContractKind = keyof typeof endpoints

export async function saveDomainContract({
  kind,
  id,
  payload,
}: {
  kind: DomainContractKind
  id?: number
  payload: Record<string, unknown>
}) {
  const path = id ? endpoints[kind] + id + "/" : endpoints[kind]
  const { error } = await fluxRequest(path, id ? "PATCH" : "POST", payload)
  if (error) return { error }

  revalidatePath("/model")
  revalidatePath("/model/domain")
  revalidatePath("/model/api")
  revalidatePath("/model/frontend")
  revalidatePath("/model/delivery")
  revalidatePath("/model/scaffold")
  return { success: true }
}
