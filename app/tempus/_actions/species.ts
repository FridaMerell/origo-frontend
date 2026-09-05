"use server"

import { revalidatePath } from "next/cache"
import { buildCookieHeader, fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import {
  getCurrentUser,
  getTempusObservationItem,
  getTempusSpeciesCategoriesAll,
  type TempusObservation,
} from "@/app/lib/dal"
import {
  getTempusSpeciesItems,
  getTempusSpeciesPage,
  getTempusSpeciesPageByCategory,
  getTempusSpeciesPhenogram,
  type TempusPage,
  type TempusSpecies,
  type TempusTaxonHit,
} from "@/app/tempus/_data/species"
import {
  registerSpeciesFormSchema,
  speciesCategoryFormSchema,
  type SpeciesCategoryFormValues,
} from "@/app/lib/schemas"
import { getSessionCookies } from "@/app/lib/session"
import { authedJsonHeaders, firstErrorMessage } from "./request"

export type TempusActionState = { error?: string; success?: boolean } | undefined
export type LoadSpeciesPageInput = { page?: number; pageSize?: number; search?: string; categoryTaxonId?: number | null }

export async function loadSpeciesPage(input: LoadSpeciesPageInput = {}): Promise<TempusPage<TempusSpecies>> {
  const page = Number.isInteger(input.page) && (input.page ?? 0) > 0 ? input.page : 1
  const pageSize = Number.isInteger(input.pageSize) && (input.pageSize ?? 0) > 0 ? Math.min(input.pageSize ?? 25, 50) : 25
  const params = { page, page_size: pageSize, search: input.search?.trim() || undefined }
  return input.categoryTaxonId && input.categoryTaxonId > 0
    ? getTempusSpeciesPageByCategory(String(input.categoryTaxonId), params)
    : getTempusSpeciesPage(params)
}

export async function matchSpeciesValues(values: string[]): Promise<{ matchedIds: string[]; unmatched: string[] }> {
  const candidates = [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 2000)
  const normalized = new Map(candidates.map((value) => [value.toLocaleLowerCase("sv").replace(/[\s-]+/g, "_"), value]))
  const pending = new Set(normalized.keys())
  const matchedIds = new Set<string>()
  let pageNumber = 1
  while (pending.size > 0) {
    const page = await getTempusSpeciesPage({ page: pageNumber, page_size: 50 })
    for (const species of page.results) {
      const keys = [species.swedish_name, species.scientific_name, String(species.dyntaxa_taxon_id)]
        .map((value) => value.toLocaleLowerCase("sv").replace(/[\s-]+/g, "_"))
      if (keys.some((key) => pending.has(key))) {
        matchedIds.add(species.id)
        keys.forEach((key) => pending.delete(key))
      }
    }
    if (!page.next) break
    pageNumber += 1
  }
  return { matchedIds: [...matchedIds], unmatched: [...pending].map((key) => normalized.get(key) ?? key) }
}

export async function loadSpeciesItems(ids: string[]): Promise<TempusSpecies[]> {
  return getTempusSpeciesItems([...new Set(ids)].slice(0, 25))
}

export async function loadSpeciesPhenogram(id: string, geoAreaId?: string) {
  return getTempusSpeciesPhenogram(id, geoAreaId)
}

export type SpeciesDetail = {
  species: TempusSpecies
  observation: TempusObservation | null
  speciesHref: string | null
}

export async function loadSpeciesDetail(speciesId: string, observationId?: string): Promise<SpeciesDetail | null> {
  const [species, observation, categories] = await Promise.all([
    getTempusSpeciesItems([speciesId]).then((items) => items[0] ?? null),
    observationId ? getTempusObservationItem(observationId) : Promise.resolve(null),
    getTempusSpeciesCategoriesAll(),
  ])
  if (!species) return null

  const category = categories
    .filter((item) => item.taxon_id && item.species.includes(species.id))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))[0]
  const speciesHref = category?.taxon_id
    ? `/taxa/${category.taxon_id}/${species.dyntaxa_taxon_id}`
    : null

  return { species, observation, speciesHref }
}

export async function createSpeciesCategory(data: SpeciesCategoryFormValues): Promise<TempusActionState> {
  const parsed = speciesCategoryFormSchema.safeParse(data)
  if (!parsed.success) return { error: "Kontrollera fälten och försök igen." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesCategories, {
    method: "POST",
    headers: await authedJsonHeaders(),
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
  const toString = (value: unknown) => typeof value === "string" ? value : ""
  return {
    taxon_id: toNumber(record.taxon_id ?? record.taxonId ?? record.dyntaxa_taxon_id ?? record.id),
    scientific_name: toString(record.scientific_name ?? record.scientificName),
    swedish_name: toString(record.swedish_name ?? record.swedishName ?? record.vernacular_name) || null,
    taxon_rank: toString(record.taxon_rank ?? record.rank ?? record.taxonRank),
  }
}

export async function searchTaxa(query: string, underTaxonId?: number | null): Promise<{ hits: TempusTaxonHit[]; error?: string }> {
  const q = query.trim()
  if (q.length < 2) return { hits: [] }
  const { sessionId, csrfToken } = await getSessionCookies()
  if (!sessionId) return { hits: [], error: "Du måste vara inloggad." }
  const search = new URLSearchParams({ q })
  if (typeof underTaxonId === "number" && underTaxonId > 0) search.set("under_taxon_id", String(underTaxonId))
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.speciesSearch}?${search}`, {
    headers: { Cookie: buildCookieHeader({ sessionid: sessionId, csrftoken: csrfToken }) },
  })
  if (!response.ok) return { hits: [], error: `Sökningen misslyckades (${response.status}).` }
  const raw: unknown = await response.json().catch(() => [])
  return { hits: (Array.isArray(raw) ? raw : []).map(normalizeTaxonHit).filter((hit) => hit.taxon_id > 0) }
}

export type RegisterSpeciesResult = { results: Array<{ taxon_id: number; ok: boolean; error?: string }>; error?: string }
export type ImportSpeciesChecklistState = { success?: boolean; message?: string; error?: string }

export async function importSpeciesChecklist(
  speciesCategory: string,
  _previousState: ImportSpeciesChecklistState,
  formData: FormData,
): Promise<ImportSpeciesChecklistState> {
  if (!speciesCategory.trim()) return { error: "Artkategorin saknas." }
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { error: "Välj en CSV-fil att importera." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
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
  return { success: true, message: "Filen har validerats och arterna har lagts i importkön." }
}

export async function registerSpeciesBatch(speciesCategory: string, taxonIds: number[]): Promise<RegisterSpeciesResult> {
  const ids = [...new Set(taxonIds.filter((id) => Number.isInteger(id) && id > 0))]
  if (ids.length === 0) return { results: [], error: "Inga arter att registrera." }
  if (!(await getCurrentUser())) return { results: [], error: "Du måste vara inloggad." }
  const headers = await authedJsonHeaders()
  const results: RegisterSpeciesResult["results"] = []
  for (const taxon_id of ids) {
    const parsed = registerSpeciesFormSchema.safeParse({ species_category: speciesCategory, dyntaxa_taxon_id: taxon_id })
    if (!parsed.success) {
      results.push({ taxon_id, ok: false, error: "Ogiltig art eller kategori." })
      continue
    }
    const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesRegister, {
      method: "POST",
      headers,
      body: JSON.stringify({ species_category: parsed.data.species_category, dyntaxa_taxon_id: parsed.data.dyntaxa_taxon_id }),
    })
    if (response.ok) results.push({ taxon_id, ok: true })
    else {
      const detail = await response.text().catch(() => "")
      results.push({ taxon_id, ok: false, error: firstErrorMessage(detail, response.status) })
    }
  }
  if (results.some((result) => result.ok)) revalidatePath("/taxa")
  return { results }
}

type FollowSpeciesOptions = { priority?: number; notificationsEnabled?: boolean }

export async function followSpecies(taxonId: string, options: FollowSpeciesOptions = {}): Promise<{ ok: boolean; error?: string }> {
  if (!(await getCurrentUser())) return { ok: false, error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesFollow, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ species: Number(taxonId), priority: options.priority ?? 2, notifications_enabled: options.notificationsEnabled ?? false }),
  })
  if (response.ok) return { ok: true }
  const detail = await response.text().catch(() => "")
  return { ok: false, error: firstErrorMessage(detail, response.status) }
}

export async function unfollowSpecies(taxonId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await getCurrentUser())) return { ok: false, error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.speciesUnfollow(taxonId), {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (response.ok) return { ok: true }
  const detail = await response.text().catch(() => "")
  return { ok: false, error: firstErrorMessage(detail, response.status) }
}

export async function getFollowedSpecies(): Promise<TempusSpecies[]> {
  if (!(await getCurrentUser())) return []
  const followed: TempusSpecies[] = []
  let pageNumber = 1
  while (true) {
    const page = await getTempusSpeciesPage({ is_followed: true, page: pageNumber, page_size: 50 })
    followed.push(...page.results)
    if (!page.next) break
    pageNumber += 1
  }
  return followed
}
