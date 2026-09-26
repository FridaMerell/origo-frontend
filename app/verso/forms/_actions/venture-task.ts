"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import { ventureTaskFormSchema, type VentureTaskFormValues } from "@/app/lib/schemas"

export type CreateVentureTaskState = { error?: string; success?: boolean } | undefined

export async function createVentureTask(
  venture: string,
  data: Pick<VentureTaskFormValues, "name" | "description" | "status">,
  path?: string
): Promise<CreateVentureTaskState> {
  const parsed = ventureTaskFormSchema
    .pick({ name: true, description: true, status: true })
    .safeParse(data)
  if (!venture || !parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.ventureTasks, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      venture,
      ...parsed.data,
      completed: parsed.data.status === "done",
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: `Uppgiften kunde inte skapas. Försök igen. (${response.status}: ${detail})` }
  }

  revalidatePath(path || "/planera")

  return { success: true }
}

export type UpdateVentureTaskState = { error?: string; success?: boolean } | undefined

export async function updateVentureTask(
  id: string,
  data: VentureTaskFormValues,
  path?: string
): Promise<UpdateVentureTaskState> {
  const parsed = ventureTaskFormSchema.safeParse(data)
  if (!id || !parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.ventureTasks}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      ...parsed.data,
      completed: parsed.data.status === "done",
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: `Uppgiften kunde inte uppdateras. Försök igen. (${response.status}: ${detail})` }
  }

  revalidatePath(path || "/planera")

  return { success: true }
}

export async function setVentureTaskStatus(
  id: string,
  status: VentureTaskFormValues["status"],
  path?: string
) {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.ventureTasks}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ status, completed: status === "done" }),
  })

  if (!response.ok) {
    throw new Error("Uppgiften kunde inte uppdateras.")
  }

  revalidatePath(path || "/planera")
}
