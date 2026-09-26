"use server"

import { revalidatePath } from "next/cache"
import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { fluxRequest } from "@/app/flux/_actions/shared"

export async function saveStackProfile({ id, payload }: { id?: number; payload: { project: number; targets: string[]; api_naming: string; auth_method: string; database: string; app_label: string; namespace: string } }) {
  const path = id ? `${FLUX_ENDPOINTS.stackProfiles}${id}/` : FLUX_ENDPOINTS.stackProfiles
  const { error } = await fluxRequest(path, id ? "PATCH" : "POST", payload)
  if (error) return { error }
  revalidatePath("/model")
  revalidatePath("/model/delivery")
  revalidatePath("/model/scaffold")
  return { success: true }
}
