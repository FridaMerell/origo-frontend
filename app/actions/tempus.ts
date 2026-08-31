"use server"

import { revalidatePath } from "next/cache"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { getSessionCookies } from "@/app/lib/session"
import {
  getCurrentUser,
  getTempusChecklistRegisterPage,
  getTempusChecklistItems,
  getTempusRouteStops,
  getTempusSpeciesPage,
  getTempusSpeciesPageByCategory,
  getTempusSpeciesItems,
  type TempusPage,
  type TempusChecklistRegisterRow,
  type TempusTaxonHit,
  type TempusSpecies,
  type TempusSuggestedStop,
  type TempusSuggestedStopsRun,
} from "@/app/lib/dal"
import {
  checklistFormSchema,
  type ChecklistFormValues,
  checklistUpdateSchema,
  type ChecklistUpdateValues,
  observationFormSchema,
  type ObservationFormValues,
  registerSpeciesFormSchema,
  routeFormSchema,
  type RouteFormValues,
  speciesCategoryFormSchema,
  type SpeciesCategoryFormValues,
} from "@/app/lib/schemas"

export type TempusActionState = { error?: string; success?: boolean } | undefined

export type LoadSpeciesPageInput = {
  page?: number
  pageSize?: number
  search?: string
  categoryTaxonId?: number | null
}

export async function loadSpeciesPage(
  input: LoadSpeciesPageInput = {}
): Promise<TempusPage<TempusSpecies>> {
  const page = Number.isInteger(input.page) && (input.page ?? 0) > 0 ? input.page : 1
  const pageSize = Number.isInteger(input.pageSize) && (input.pageSize ?? 0) > 0
    ? Math.min(input.pageSize ?? 25, 50)
    : 25
  const params = {
    page,
    page_size: pageSize,
    search: input.search?.trim() || undefined,
  }

  return input.categoryTaxonId && input.categoryTaxonId > 0
    ? getTempusSpeciesPageByCategory(String(input.categoryTaxonId), params)
    : getTempusSpeciesPage(params)
}

export async function matchSpeciesValues(values: string[]): Promise<{
  matchedIds: string[]
  unmatched: string[]
}> {
  const candidates = [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 2000)
  const normalized = new Map(candidates.map((value) => [
    value.toLocaleLowerCase("sv").replace(/[\s-]+/g, "_"),
    value,
  ]))
  const pending = new Set(normalized.keys())
  const matchedIds = new Set<string>()
  let pageNumber = 1

  while (pending.size > 0) {
    const page = await getTempusSpeciesPage({ page: pageNumber, page_size: 50 })
    for (const species of page.results) {
      const keys = [
        species.swedish_name,
        species.scientific_name,
        String(species.dyntaxa_taxon_id),
      ].map((value) => value.toLocaleLowerCase("sv").replace(/[\s-]+/g, "_"))
      if (keys.some((key) => pending.has(key))) {
        matchedIds.add(species.id)
        keys.forEach((key) => pending.delete(key))
      }
    }
    if (!page.next) break
    pageNumber += 1
  }

  return {
    matchedIds: [...matchedIds],
    unmatched: [...pending].map((key) => normalized.get(key) ?? key),
  }
}

export async function loadSpeciesItems(ids: string[]): Promise<TempusSpecies[]> {
  return getTempusSpeciesItems([...new Set(ids)].slice(0, 25))
}

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
      species: parsed.data.species,
      species_category_ids: parsed.data.species_category_ids,
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

  revalidatePath("/checklistor")
  revalidatePath(`/checklistor/${checklist.id}`)
  return {
    success: true,
    checklistId: checklist.id,
  }
}

export type LoadChecklistRegisterPageInput = {
  checklistId: string
  page?: number
  search?: string
}

export async function loadChecklistRegisterPage({
  checklistId,
  page = 1,
  search = "",
}: LoadChecklistRegisterPageInput): Promise<TempusPage<TempusChecklistRegisterRow>> {
  const requestedPage = Number.isInteger(page) && page > 0 ? page : 1
  const normalizedSearch = search.trim().toLocaleLowerCase("sv")

  if (!normalizedSearch) {
    return getTempusChecklistRegisterPage(checklistId, {
      page: requestedPage,
      page_size: 250,
    })
  }

  const firstPage = await getTempusChecklistRegisterPage(checklistId, {
    page: 1,
    page_size: 250,
  })
  const totalSourcePages = Math.max(1, Math.ceil(firstPage.count / 250))
  const remainingPages = await Promise.all(
    Array.from({ length: totalSourcePages - 1 }, (_, index) =>
      getTempusChecklistRegisterPage(checklistId, {
        page: index + 2,
        page_size: 250,
      }),
    ),
  )
  const matches = [firstPage, ...remainingPages]
    .flatMap((result) => result.results)
    .filter((row) =>
      [row.swedish_name, row.scientific_name, String(row.dyntaxa_taxon_id)].some((value) =>
        value.toLocaleLowerCase("sv").includes(normalizedSearch),
      ),
    )
  const start = (requestedPage - 1) * 250

  return {
    results: matches.slice(start, start + 250),
    count: matches.length,
    previous: requestedPage > 1 ? String(requestedPage - 1) : null,
    next: start + 250 < matches.length ? String(requestedPage + 1) : null,
    pageSize: 250,
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

export type ImportSpeciesChecklistState = {
  success?: boolean
  message?: string
  error?: string
}

export async function importSpeciesChecklist(
  speciesCategory: string,
  _previousState: ImportSpeciesChecklistState,
  formData: FormData
): Promise<ImportSpeciesChecklistState> {
  if (!speciesCategory.trim()) {
    return { error: "Artkategorin saknas." }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Välj en CSV-fil att importera." }
  }

  const user = await getCurrentUser()
  if (!user) {
    return { error: "Du måste vara inloggad." }
  }

  const { sessionId, csrfToken } = await getSessionCookies()
  const body = new FormData()
  body.set("species_category", speciesCategory)
  body.set("file", file, file.name)

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesImportChecklist, {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken ?? "",
      Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
    },
    body,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/taxa")
  return {
    success: true,
    message: "Filen har validerats och arterna har lagts i importkön.",
  }
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


type FollowSpeciesOptions = {
  priority?: number
  notificationsEnabled?: boolean
}

export async function followSpecies(
  taxonId: string,
  options: FollowSpeciesOptions = {},
): Promise<{ ok: boolean; error?: string }> {
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
    body: JSON.stringify({
      species: Number(taxonId),
      priority: options.priority ?? 2,
      notifications_enabled: options.notificationsEnabled ?? false,
    }),
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
    body: JSON.stringify({ species: Number(taxonId) }),
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
  if (!user) return []

  const followed: TempusSpecies[] = []
  let pageNumber = 1

  while (true) {
    const page = await getTempusSpeciesPage({
      is_followed: true,
      page: pageNumber,
      page_size: 50,
    })
    followed.push(...page.results)

    if (!page.next) break
    pageNumber += 1
  }

  return followed
}

export type RouteResult = { success?: boolean; routeId?: string; error?: string }

export async function createRoute(input: RouteFormValues): Promise<RouteResult> {
  const parsed = routeFormSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }

  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.routes, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(parsed.data),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  const created = (await response.json().catch(() => null)) as { id?: unknown } | null
  revalidatePath("/rutt")
  return {
    success: true,
    routeId: typeof created?.id === "string" ? created.id : undefined,
  }
}

export async function updateRoute(
  id: string,
  input: Partial<RouteFormValues>,
): Promise<RouteResult> {
  const parsed = routeFormSchema.partial().safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  }

  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.routes}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(parsed.data),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath("/rutt")
  revalidatePath(`/rutt/${id}`)
  return { success: true, routeId: id }
}

export async function deleteRoute(id: string): Promise<{ success?: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const { sessionId, csrfToken } = await getSessionCookies()
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.routes}${id}/`, {
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

  revalidatePath("/rutt")
  return { success: true }
}

export type AddRouteStopInput = {
  route: string
  name: string
  location: { type: "Point"; coordinates: [number, number] }
  planned_at?: string | null
}

export async function createRouteStop(
  input: AddRouteStopInput,
): Promise<{ success?: boolean; error?: string }> {
  if (!input.route || !input.name.trim()) {
    return { error: "Ruttstoppet saknar namn eller rutt." }
  }
  if (input.location?.type !== "Point" || input.location.coordinates.length !== 2) {
    return { error: "Ruttstoppet saknar en giltig position." }
  }

  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const existing = await getTempusRouteStops(input.route)
  const nextSequence = existing.reduce((max, stop) => Math.max(max, stop.sequence), 0) + 1

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.routeStops, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      route: input.route,
      sequence: nextSequence,
      name: input.name.trim(),
      location: input.location,
      planned_at: input.planned_at ?? null,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  revalidatePath(`/rutt/${input.route}`)
  return { success: true }
}

export async function deleteRouteStop(
  routeId: string,
  stopId: string,
): Promise<{ success?: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: "Du måste vara inloggad." }

  const { sessionId, csrfToken } = await getSessionCookies()
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.routeStops}${stopId}/`, {
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

  revalidatePath(`/rutt/${routeId}`)
  return { success: true }
}

export type SuggestedStopsParams = {
  taxon_id?: number | null
  since_days?: number
  notable_days?: number
  max_detour_m?: number | null
  num_stops?: number
  refresh?: boolean
}

export type SuggestedStopsRunResult = {
  data?: TempusSuggestedStopsRun
  error?: string
}

function suggestedStopsQuery(params: SuggestedStopsParams): string {
  const search = new URLSearchParams()
  if (params.taxon_id && params.taxon_id > 0) search.set("taxon_id", String(params.taxon_id))
  if (params.since_days) search.set("since_days", String(params.since_days))
  if (params.notable_days) search.set("notable_days", String(params.notable_days))
  if (typeof params.max_detour_m === "number" && params.max_detour_m >= 0) {
    search.set("max_detour_m", String(params.max_detour_m))
  }
  if (params.num_stops) search.set("num_stops", String(params.num_stops))
  if (params.refresh) search.set("refresh", "true")
  const query = search.toString()
  return query ? `?${query}` : ""
}

function parseSuggestedStopsRun(body: unknown): TempusSuggestedStopsRun | null {
  if (!body || typeof body !== "object") return null
  const run = body as Partial<TempusSuggestedStopsRun>
  if (typeof run.status !== "string") return null
  return {
    route: typeof run.route === "string" ? run.route : "",
    status: run.status as TempusSuggestedStopsRun["status"],
    params:
      run.params && typeof run.params === "object"
        ? (run.params as Record<string, unknown>)
        : {},
    result: Array.isArray(run.result) ? (run.result as TempusSuggestedStop[]) : [],
    error: typeof run.error === "string" ? run.error : "",
    created_at: typeof run.created_at === "string" ? run.created_at : "",
    started_at: typeof run.started_at === "string" ? run.started_at : null,
    finished_at: typeof run.finished_at === "string" ? run.finished_at : null,
  }
}

// Kick off (or re-attach to) the background computation. 202 = started, 200 = a
// fresh result already existed; both carry the run object. Treat them the same:
// read `status`, and poll if it is not yet succeeded/failed.
export async function startSuggestedStops(
  routeId: string,
  params: SuggestedStopsParams = {},
): Promise<SuggestedStopsRunResult> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return { error: "Du måste vara inloggad." }

  let response: Response
  try {
    response = await fetchOrigoApi(
      `${TEMPUS_ENDPOINTS.routeSuggestedStops(routeId)}${suggestedStopsQuery(params)}`,
      {
        method: "POST",
        headers: {
          "X-CSRFToken": csrfToken ?? "",
          Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
        },
      },
    )
  } catch {
    return { error: "Kunde inte nå servern. Försök igen om en stund." }
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  const run = parseSuggestedStopsRun(await response.json().catch(() => null))
  if (!run) return { error: "Kunde inte tolka svaret från servern." }
  return { data: run }
}

// Poll the current run for a route. Call every ~3 s while status is
// "pending"/"running"; stop on "succeeded" or "failed".
export async function pollSuggestedStops(
  routeId: string,
): Promise<SuggestedStopsRunResult> {
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return { error: "Du måste vara inloggad." }

  let response: Response
  try {
    response = await fetchOrigoApi(TEMPUS_ENDPOINTS.routeSuggestedStops(routeId), {
      headers: {
        Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }),
      },
    })
  } catch {
    return { error: "Kunde inte nå servern. Försök igen om en stund." }
  }

  if (response.status === 404) {
    return { error: "Ingen sökning har startats för den här rutten." }
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  const run = parseSuggestedStopsRun(await response.json().catch(() => null))
  if (!run) return { error: "Kunde inte tolka svaret från servern." }
  return { data: run }
}
