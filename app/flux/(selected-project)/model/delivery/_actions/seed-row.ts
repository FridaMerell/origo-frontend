"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxRequest } from "@/app/flux/_actions/shared"

export async function saveSeedRow({ id, payload }: { id?: number; payload: { entity: number; order: number; data: Record<string, unknown> } }) {
  const path = id ? `${FLUX_ENDPOINTS.seedRows}${id}/` : FLUX_ENDPOINTS.seedRows
  const { error } = await fluxRequest(path, id ? "PATCH" : "POST", payload)
  if (error) return { error }
  revalidatePath("/model")
  revalidatePath("/model/delivery")
  revalidatePath("/model/scaffold")
  return { success: true }
}
