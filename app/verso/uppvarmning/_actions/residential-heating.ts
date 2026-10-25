"use server"

import { revalidatePath } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import { residentialHeatingFormSchema, type ResidentialHeatingFormValues } from "@/app/lib/schemas"

export type ResidentialHeatingActionState = { error?: string; success?: boolean } | undefined

/** Creates the house's connection, or updates it; an empty token keeps the stored one. */
export async function saveResidentialHeating(
  id: string | null,
  data: ResidentialHeatingFormValues
): Promise<ResidentialHeatingActionState> {
  const parsed = residentialHeatingFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Ange en giltig adress och enhetens id." }
  }
  const token = parsed.data.token?.trim()
  if (!id && !token) {
    return { error: "Token krävs." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const response = await fetchOrigoApi(
    id ? `${VERSO_ENDPOINTS.residentialHeating}${id}/` : VERSO_ENDPOINTS.residentialHeating,
    {
      method: id ? "PATCH" : "POST",
      headers: await authedJsonHeaders(),
      body: JSON.stringify({ house, base_url: parsed.data.base_url, device: parsed.data.device, ...(token ? { token } : {}) }),
    }
  )
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    return { error: payload ? `Kopplingen kunde inte sparas: ${JSON.stringify(payload)}` : "Kopplingen kunde inte sparas. Försök igen." }
  }

  revalidatePath("/uppvarmning")
  return { success: true }
}
