"use server"

import { FLUX_ENDPOINTS } from "@/app/lib/config"
import { getFluxIdentities } from "@/app/lib/dal"
import { identityFormSchema, identityFormToPayload, type IdentityFormValues } from "@/app/flux/identity/identity-form"
import { fluxRequest, type FluxActionState } from "./shared"
import type { FluxIdentity, FluxProject } from "@/app/lib/dal"

export async function listIdentities(): Promise<FluxIdentity[]> {
  return getFluxIdentities()
}

export async function saveIdentity(
  id: number | null,
  values: IdentityFormValues,
): Promise<FluxActionState<FluxIdentity>> {
  const parsed = identityFormSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrollera identitetens uppgifter." }

  const { data, error } = await fluxRequest<FluxIdentity>(
    id ? `${FLUX_ENDPOINTS.identities}${id}/` : FLUX_ENDPOINTS.identities,
    id ? "PATCH" : "POST",
    identityFormToPayload(parsed.data),
  )
  if (error) return { error }
  if (!data) return { error: "Identiteten sparades, men kunde inte läsas tillbaka." }
  return { success: true, data }
}

export async function deleteIdentity(id: number): Promise<FluxActionState> {
  const { error } = await fluxRequest(`${FLUX_ENDPOINTS.identities}${id}/`, "DELETE")
  return error ? { error } : { success: true }
}

/** Switch a project's identity on or off, or choose which one it uses. Turning it off clears the choice server-side. */
export async function setProjectIdentity(
  projectId: number,
  change: { include_identity: boolean; identity?: number | null },
): Promise<FluxActionState<FluxProject>> {
  const body: Record<string, unknown> = { include_identity: change.include_identity }
  if (change.include_identity && change.identity !== undefined) body.identity = change.identity

  const { data, error } = await fluxRequest<FluxProject>(`${FLUX_ENDPOINTS.projects}${projectId}/`, "PATCH", body)
  if (error) return { error }
  if (!data) return { error: "Projektet sparades, men kunde inte läsas tillbaka." }
  return { success: true, data }
}
