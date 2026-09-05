"use server"

import { revalidatePath } from "next/cache"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { TEMPUS_ENDPOINTS } from "@/app/lib/config"
import { getCurrentUser } from "@/app/lib/dal"
import {
  getTempusChecklistItems,
  getTempusChecklistRegisterPage,
  type TempusChecklistRegisterRow,
  type TempusPage,
} from "@/app/tempus/_data/checklists"
import {
  checklistFormSchema,
  checklistUpdateSchema,
  type ChecklistFormValues,
  type ChecklistUpdateValues,
} from "@/app/lib/schemas"
import { authedJsonHeaders, firstErrorMessage } from "./request"

export type CreateChecklistResult = {
  success?: boolean
  checklistId?: string
  createdItems?: number
  error?: string
}

export async function createChecklist(input: ChecklistFormValues): Promise<CreateChecklistResult> {
  const parsed = checklistFormSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }

  const response = await fetchOrigoApi(TEMPUS_ENDPOINTS.checklists, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      name: parsed.data.name,
      description: parsed.data.description,
      auto_add: parsed.data.auto_add,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      geo_area: parsed.data.geo_area,
      route: null,
      species: parsed.data.species,
      species_category_ids: parsed.data.species_category_ids,
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  const checklist = (await response.json().catch(() => null)) as { id?: unknown } | null
  if (typeof checklist?.id !== "string") return { error: "Checklistan skapades, men svaret saknade ett checklist-ID." }
  revalidatePath("/checklistor")
  revalidatePath(`/checklistor/${checklist.id}`)
  return { success: true, checklistId: checklist.id }
}

export type LoadChecklistRegisterPageInput = { checklistId: string; page?: number; search?: string }

export async function loadChecklistRegisterPage({
  checklistId,
  page = 1,
  search = "",
}: LoadChecklistRegisterPageInput): Promise<TempusPage<TempusChecklistRegisterRow>> {
  const requestedPage = Number.isInteger(page) && page > 0 ? page : 1
  const normalizedSearch = search.trim().toLocaleLowerCase("sv")
  if (!normalizedSearch) {
    return getTempusChecklistRegisterPage(checklistId, { page: requestedPage, page_size: 250 })
  }

  const firstPage = await getTempusChecklistRegisterPage(checklistId, { page: 1, page_size: 250 })
  const totalSourcePages = Math.max(1, Math.ceil(firstPage.count / 250))
  const remainingPages = await Promise.all(Array.from({ length: totalSourcePages - 1 }, (_, index) =>
    getTempusChecklistRegisterPage(checklistId, { page: index + 2, page_size: 250 }),
  ))
  const matches = [firstPage, ...remainingPages]
    .flatMap((result) => result.results)
    .filter((row) => [row.swedish_name, row.scientific_name, String(row.dyntaxa_taxon_id)]
      .some((value) => value.toLocaleLowerCase("sv").includes(normalizedSearch)))
  const start = (requestedPage - 1) * 250
  return {
    results: matches.slice(start, start + 250),
    count: matches.length,
    previous: requestedPage > 1 ? String(requestedPage - 1) : null,
    next: start + 250 < matches.length ? String(requestedPage + 1) : null,
    pageSize: 250,
  }
}

export async function updateChecklist(id: string, input: ChecklistUpdateValues): Promise<CreateChecklistResult> {
  const parsed = checklistUpdateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten och försök igen." }
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const headers = await authedJsonHeaders()
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.checklists}${id}/`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      name: parsed.data.name,
      description: parsed.data.description,
      auto_add: parsed.data.auto_add,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
      geo_area: parsed.data.geo_area,
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }

  const existingItems = await getTempusChecklistItems(id)
  const existingBySpecies = new Map(existingItems.map((item) => [item.species, item]))
  const desired = new Set(parsed.data.species)
  const toRemove = existingItems.filter((item) => !desired.has(item.species))
  const toAdd = parsed.data.species.filter((speciesId) => !existingBySpecies.has(speciesId))
  const highestSequence = existingItems.reduce((max, item) => Math.max(max, item.sequence), 0)
  const changeResponses = await Promise.all([
    ...toRemove.map((item) => fetchOrigoApi(`${TEMPUS_ENDPOINTS.checklistItems}${item.id}/`, { method: "DELETE", headers })),
    ...toAdd.map((speciesId, index) => fetchOrigoApi(TEMPUS_ENDPOINTS.checklistItems, {
      method: "POST",
      headers,
      body: JSON.stringify({ checklist: id, species: speciesId, sequence: highestSequence + index + 1, notes: "" }),
    })),
  ])
  revalidatePath("/checklistor")
  revalidatePath(`/checklistor/${id}`)
  const failed = changeResponses.find((itemResponse) => !itemResponse.ok && itemResponse.status !== 404)
  if (failed) {
    const detail = await failed.text().catch(() => "")
    return { checklistId: id, error: `Checklistan sparades, men artlistan kunde inte uppdateras helt. ${firstErrorMessage(detail, failed.status)}` }
  }
  return { success: true, checklistId: id }
}

export async function deleteChecklist(id: string): Promise<{ success?: boolean; error?: string }> {
  if (!(await getCurrentUser())) return { error: "Du måste vara inloggad." }
  const response = await fetchOrigoApi(`${TEMPUS_ENDPOINTS.checklists}${id}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => "")
    return { error: firstErrorMessage(detail, response.status) }
  }
  revalidatePath("/checklistor")
  return { success: true }
}
