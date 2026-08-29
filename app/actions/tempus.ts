"use server"

import { revalidatePath } from "next/cache"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import {
  getCurrentUser,
  getTempusChecklistItems,
  type TempusTaxonHit,
  TempusSpecies,
} from "@/app/lib/dal"
import {
  checklistFormSchema,
  type ChecklistFormValues,
  checklistUpdateSchema,
  type ChecklistUpdateValues,
  observationFormSchema,
  type ObservationFormValues,
  registerSpeciesFormSchema,
  speciesCategoryFormSchema,
  type SpeciesCategoryFormValues,
} from "@/app/lib/schemas"

export type TempusActionState = { error?: string; success?: boolean } | undefined

export type CreateChecklistResult = {
  success?: boolean
  checklistId?: string
  createdItems?: number
  error?: string
}

export type GeoAreaKind =
  | "country"
  | "county"
  | "province"
  | "nature_reserve"
  | "biological_area"

export type GeoAreaPolygon = {
  type: "Polygon"
  coordinates: readonly (readonly (readonly number[])[])[]
}

export type CreateGeoAreaInput = {
  name: string
  kind: GeoAreaKind
  geometry: GeoAreaPolygon | null
}

export type CreateGeoAreaResult = {
  error?: string
  success?: boolean
  id?: string
}

const GEO_AREA_KINDS: readonly GeoAreaKind[] = [
  "country",
  "county",
  "province",
  "nature_reserve",
  "biological_area",
]

function firstErrorMessage(detail: string, status: number): string {
  const fallback = `Ett fel uppstod (${status}).`
  try {
    const parsed = JSON.parse(detail)
    const firstKey = Object.keys(parsed)[0]
    const firstValue = firstKey ? parsed[firstKey] : undefined
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") return firstValue[0]
    if (typeof firstValue === "string") return firstValue
    if (typeof parsed?.detail === "string") return parsed.detail
  } catch {
    // not JSON (e.g. an HTML error page) — never surface the raw body
  }
  return fallback
}

export async function createChecklist(
  input: ChecklistFormValues
): Promise<CreateChecklistResult> {
  const parsed = checklistFormSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }

  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const { sessionId, csrfToken } = await getSessionCookies()
  const headers = {
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken ?? "",
    Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
  }
  const checklistResponse = await fetchOrigoApi(TEMPUS_ENDPOINTS.checklists, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: parsed.data.name,
      description: parsed.data.description,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      geo_area: parsed.data.geo_area,
      route: null,
    }),
  })

  if (!checklistResponse.ok) {
    const detail = await checklistResponse.text().catch(() => "")
    return { error: firstErrorMessage(detail, checklistResponse.status) }
  }

  const checklist = (await checklistResponse.json().catch(() => null)) as { id?: unknown } | null
  if (typeof checklist?.id !== "string") {
    return { error: "Checklistan skapades, men svaret saknade ett checklist-ID." }
  }

  const itemResponses = await Promise.all(
    parsed.data.species.map((speciesId, index) =>
      fetchOrigoApi(TEMPUS_ENDPOINTS.checklistItems, {
        method: "POST",
        headers,
        body: JSON.stringify({
          checklist: checklist.id,
          species: speciesId,
          sequence: index + 1,
          notes: "",
        }),
      })
    )
  )
  const createdItems = itemResponses.filter((response) => response.ok).length
  const failedResponse = itemResponses.find((response) => !response.ok)

  revalidatePath("/checklistor")
  revalidatePath(`/checklistor/${checklist.id}`)
  if (failedResponse) {
    const detail = await failedResponse.text().catch(() => "")
    return {
      checklistId: checklist.id,
      createdItems,
      error: `Checklistan skapades, men ${itemResponses.length - createdItems} arter kunde inte läggas till. ${firstErrorMessage(detail, failedResponse.status)}`,
    }
  }

  return {
    success: true,
    checklistId: checklist.id,
    createdItems,
  }
}

export async function updateChecklist(
  id: string,
  input: ChecklistUpdateValues
): Promise<CreateChecklistResult> {
  const parsed = checklistUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }

  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const { sessionId, csrfToken } = await getSessionCookies()
  const headers = {
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken ?? "",
    Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
  }

  const checklistResponse = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.checklists}${id}/`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      name: parsed.data.name,
      description: parsed.data.description,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      geo_area: parsed.data.geo_area,
    }),
  })

  if (!checklistResponse.ok) {
    const detail = await checklistResponse.text().catch(() => "")
    return { error: firstErrorMessage(detail, checklistResponse.status) }
  }

  const existingItems = await getTempusChecklistItems(id)
  const existingBySpecies = new Map(existingItems.map((item) => [item.species, item]))
  const desired = new Set(parsed.data.species)

  const toRemove = existingItems.filter((item) => !desired.has(item.species))
  const toAdd = parsed.data.species.filter((speciesId) => !existingBySpecies.has(speciesId))
  const highestSequence = existingItems.reduce((max, item) => Math.max(max, item.sequence), 0)

  const changeResponses = await Promise.all([
    ...toRemove.map((item) =>
      fetchOrigoApi(`${TEMPUS_ENDPOINTS.checklistItems}${item.id}/`, {
        method: "DELETE",
        headers,
      })
    ),
    ...toAdd.map((speciesId, index) =>
      fetchOrigoApi(TEMPUS_ENDPOINTS.checklistItems, {
        method: "POST",
        headers,
        body: JSON.stringify({
          checklist: id,
          species: speciesId,
          sequence: highestSequence + index + 1,
          notes: "",
        }),
      })
    ),
  ])

  revalidatePath("/checklistor")
  revalidatePath(`/checklistor/${id}`)

  const failed = changeResponses.find(
    (response) => !response.ok && response.status !== 404
  )
  if (failed) {
    const detail = await failed.text().catch(() => "")
    return {
      checklistId: id,
      error: `Checklistan sparades, men artlistan kunde inte uppdateras helt. ${firstErrorMessage(detail, failed.status)}`,
    }
  }

  return { success: true, checklistId: id }
}

export async function deleteChecklist(id: string): Promise<{ success?: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const { sessionId, csrfToken } = await getSessionCookies()
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.checklists}${id}/`, {
    method: "DELETE",
    headers: {
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/checklistor")
  return { success: true }
}

export type ObservationResult = {
  success?: boolean
  observationId?: string
  error?: string
}

async function authedJsonHeaders() {
  const { sessionId, csrfToken } = await getSessionCookies()
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": csrfToken ?? "",
    Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
  }
}

export async function createObservation(
  input: ObservationFormValues
): Promise<ObservationResult> {
  const parsed = observationFormSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }

  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.observations, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(parsed.data),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  const created = (await response.json().catch(() => null)) as { id?: unknown } | null
  revalidatePath("/observationer")
  return {
    success: true,
    observationId: typeof created?.id === "string" ? created.id : undefined,
  }
}

export type ObservationBatchResult = {
  results: Array<{ index: number; species: string; ok: boolean; observationId?: string; error?: string }>
  created: number
  error?: string
}

export async function createObservationsBatch(
  inputs: ObservationFormValues[]
): Promise<ObservationBatchResult> {
  if (inputs.length === 0) {
    return { results: [], created: 0, error: "Lägg till minst en observation." }
  }

  const user = await getCurrentUser()
  if (!user) return { results: [], created: 0, error: "Du måste vara inloggad." }

  const headers = await authedJsonHeaders()
  const results: ObservationBatchResult["results"] = []

  await Promise.all(
    inputs.map(async (input, index) => {
      const parsed = observationFormSchema.safeParse(input)
      if (!parsed.success) {
        results[index] = {
          index,
          species: input.species,
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Ogiltig observation.",
        }
        return
      }

      const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.observations, {
        method: "POST",
        headers,
        body: JSON.stringify(parsed.data),
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        results[index] = {
          index,
          species: parsed.data.species,
          ok: false,
          error: firstErrorMessage(detail, response.status),
        }
        return
      }

      const created = (await response.json().catch(() => null)) as { id?: unknown } | null
      results[index] = {
        index,
        species: parsed.data.species,
        ok: true,
        observationId: typeof created?.id === "string" ? created.id : undefined,
      }
    })
  )

  const ordered = results.filter(Boolean)
  const createdCount = ordered.filter((result) => result.ok).length
  if (createdCount > 0) revalidatePath("/observationer")
  return { results: ordered, created: createdCount }
}

export async function updateObservation(
  id: string,
  input: Partial<ObservationFormValues>
): Promise<ObservationResult> {
  const parsed = observationFormSchema.partial().safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }

  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.observations}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(parsed.data),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/observationer")
  return { success: true, observationId: id }
}

export async function deleteObservation(id: string): Promise<ObservationResult> {
  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.observations}${id}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })

  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/observationer")
  return { success: true }
}

export async function createGeoArea(
  input: CreateGeoAreaInput
): Promise<CreateGeoAreaResult> {
  const name = input.name.trim()
  if (!name) return { error: "Ange ett namn för området." }
  if (!GEO_AREA_KINDS.includes(input.kind)) {
    return { error: "Välj en giltig områdestyp." }
  }
  if (!input.geometry || input.geometry.type !== "Polygon") {
    return { error: "Rita ett område med minst tre punkter." }
  }

  const outerRing = input.geometry.coordinates[0]
  if (!outerRing || outerRing.length < 4) {
    return { error: "Rita ett område med minst tre punkter." }
  }

  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const { sessionId, csrfToken } = await getSessionCookies()
  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.geoAreas, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({
      name,
      kind: input.kind,
      country_code: "SE",
      geometry: {
        type: "MultiPolygon",
        coordinates: [input.geometry.coordinates],
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  const created = (await response.json().catch(() => null)) as { id?: unknown } | null
  revalidatePath("/maps")
  return {
    success: true,
    id: typeof created?.id === "string" ? created.id : undefined,
  }
}

export async function createSpeciesCategory(
  data: SpeciesCategoryFormValues
): Promise<TempusActionState> {
  const parsed = speciesCategoryFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Kontrollera fälten och försök igen." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Du måste vara inloggad." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesCategories, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({
      label: parsed.data.label.trim(),
      image_url: parsed.data.image_url?.trim() ?? "",
      taxon_id: parsed.data.taxon_id,
      species: parsed.data.species,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/taxa")
  return { success: true }
}

function normalizeTaxonHit(raw: unknown): TempusTaxonHit {
  const record = (raw ?? {}) as Record<string, unknown>
  const toNumber = (value: unknown) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const toString = (value: unknown) => (typeof value === "string" ? value : "")
  return {
    taxon_id: toNumber(
      record.taxon_id ?? record.taxonId ?? record.dyntaxa_taxon_id ?? record.id
    ),
    scientific_name: toString(record.scientific_name ?? record.scientificName),
    swedish_name:
      toString(
        record.swedish_name ?? record.swedishName ?? record.vernacular_name
      ) || null,
    taxon_rank: toString(record.taxon_rank ?? record.rank ?? record.taxonRank),
  }
}

export async function searchTaxa(
  query: string,
  underTaxonId?: number | null
): Promise<{ hits: TempusTaxonHit[]; error?: string }> {
  const q = query.trim()
  if (q.length < 2) return { hits: [] }

  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return { hits: [], error: "Du måste vara inloggad." }

  const search = new URLSearchParams({ q })
  if (typeof underTaxonId === "number" && underTaxonId > 0) {
    search.set("under_taxon_id", String(underTaxonId))
  }

  const response = await fetchOrigoApi(
    `${TEMPUS_ENDPOINTS.speciesSearch}?${search}`,
    {
      headers: {
        Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
      },
    }
  )

  if (!response.ok) {
    return { hits: [], error: `Sökningen misslyckades (${response.status}).` }
  }

  const raw: unknown = await response.json().catch(() => [])
  const hits = (Array.isArray(raw) ? raw : [])
    .map(normalizeTaxonHit)
    .filter((hit) => hit.taxon_id > 0)
  return { hits }
}

export type RegisterSpeciesResult = {
  results: Array<{ taxon_id: number; ok: boolean; error?: string }>
  error?: string
}

export async function registerSpeciesBatch(
  speciesCategory: string,
  taxonIds: number[]
): Promise<RegisterSpeciesResult> {
  const ids = [...new Set(taxonIds.filter((id) => Number.isInteger(id) && id > 0))]
  if (ids.length === 0) {
    return { results: [], error: "Inga arter att registrera." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { results: [], error: "Du måste vara inloggad." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const results: RegisterSpeciesResult["results"] = []
  for (const taxon_id of ids) {
    const parsed = registerSpeciesFormSchema.safeParse({
      species_category: speciesCategory,
      dyntaxa_taxon_id: taxon_id,
    })
    if (!parsed.success) {
      results.push({ taxon_id, ok: false, error: "Ogiltig art eller kategori." })
      continue
    }

    const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesRegister, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken ?? "",
        Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
      },
      body: JSON.stringify({
        species_category: parsed.data.species_category,
        dyntaxa_taxon_id: parsed.data.dyntaxa_taxon_id,
      }),
    })

    if (response.ok) {
      results.push({ taxon_id, ok: true })
    } else {
      const detail = await response.text().catch(() => "")
      results.push({
        taxon_id,
        ok: false,
        error: firstErrorMessage(detail, response.status),
      })
    }
  }

  if (results.some((result) => result.ok)) {
    revalidatePath("/taxa")
  }
  return { results }
}


export async function followSpecies(taxonId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, error: "Du måste vara inloggad." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesFollow, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ id: taxonId }),
  })

  if (response.ok) {
    return { ok: true }
  } else {
    const detail = await response.text().catch(() => "")
    return { ok: false, error: firstErrorMessage(detail, response.status) }
  }
}

export const unfollowSpecies = async (taxonId: string): Promise<{ ok: boolean; error?: string }> => {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, error: "Du måste vara inloggad." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesFollow, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body: JSON.stringify({ id: taxonId }),
  })

  if (response.ok) {
    return { ok: true }
  } else {
    const detail = await response.text().catch(() => "")
    return { ok: false, error: firstErrorMessage(detail, response.status) }
  }
}

export const getFollowedSpecies = async (): Promise<TempusSpecies[]> => {
  const user = await getCurrentUser()
  if (!user) {
    return []
  }

  const { sessionId, csrfToken } = await getSessionCookies()

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesFollow, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
  })

  if (response.ok) {
    const species = await response.json().catch(() => [])
    return  species ?? []
  } else {
    return []
  }
}
