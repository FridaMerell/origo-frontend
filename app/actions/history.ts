"use server"

import { revalidatePath as revalidate } from "next/cache"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import {
  documentFormSchema,
  historyEventFormSchema,
  personFormSchema,
  personRelationFormSchema,
  type DocumentFormValues,
  type HistoryEventFormValues,
  type PersonFormValues,
  type PersonRelationFormValues,
} from "@/app/lib/schemas"

export type HistoryActionState = { error?: string; success?: boolean; id?: string } | undefined

const HISTORY_PATH = "/historia"

// "layout" also refreshes the sub-pages (e.g. /historia/personer), which show the same data.
function revalidatePath(path: string) {
  revalidate(path, "layout")
}

function personBody(data: PersonFormValues) {
  const { birth_date, death_date, ...rest } = data
  // Year-only knowledge is sent as any date in that year with precision "year".
  return { ...rest, birth_date: birth_date || null, death_date: death_date || null }
}

function eventBody(data: HistoryEventFormValues) {
  const { date_end, ...rest } = data
  return { ...rest, date_end: date_end || null }
}

export async function createPerson(data: PersonFormValues): Promise<HistoryActionState> {
  const parsed = personFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Personen kunde inte sparas." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.people, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ house, ...personBody(parsed.data) }),
  })
  if (!response.ok) {
    return { error: "Personen kunde inte skapas. Försök igen." }
  }

  const person: { id: string } = await response.json()
  revalidatePath(HISTORY_PATH)
  return { success: true, id: person.id }
}

export async function updatePerson(id: string, data: PersonFormValues): Promise<HistoryActionState> {
  const parsed = personFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Personen kunde inte sparas." }
  }

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.people}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(personBody(parsed.data)),
  })
  if (!response.ok) {
    return { error: "Personen kunde inte sparas. Försök igen." }
  }

  revalidatePath(HISTORY_PATH)
  return { success: true }
}

/** Sets the person's main picture to one of the house's photos, or clears it with null. */
export async function setPersonPortrait(id: string, portrait: string | null): Promise<HistoryActionState> {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.people}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ portrait }),
  })
  if (!response.ok) {
    return { error: "Porträttet kunde inte sparas. Försök igen." }
  }

  revalidatePath(HISTORY_PATH)
  return { success: true }
}

export async function deletePerson(id: string): Promise<HistoryActionState> {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.people}${id}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    return { error: "Personen kunde inte tas bort. Försök igen." }
  }

  revalidatePath(HISTORY_PATH)
  return { success: true }
}

export async function createHistoryEvent(data: HistoryEventFormValues): Promise<HistoryActionState> {
  const parsed = historyEventFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Händelsen kunde inte sparas." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.historyEvents, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ house, ...eventBody(parsed.data) }),
  })
  if (!response.ok) {
    return { error: "Händelsen kunde inte skapas. Försök igen." }
  }

  const event: { id: string } = await response.json()
  revalidatePath(HISTORY_PATH)
  return { success: true, id: event.id }
}

export async function updateHistoryEvent(
  id: string,
  data: HistoryEventFormValues
): Promise<HistoryActionState> {
  const parsed = historyEventFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Händelsen kunde inte sparas." }
  }

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.historyEvents}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(eventBody(parsed.data)),
  })
  if (!response.ok) {
    return { error: "Händelsen kunde inte sparas. Försök igen." }
  }

  revalidatePath(HISTORY_PATH)
  return { success: true }
}

export async function deleteHistoryEvent(id: string): Promise<HistoryActionState> {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.historyEvents}${id}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    return { error: "Händelsen kunde inte tas bort. Försök igen." }
  }

  revalidatePath(HISTORY_PATH)
  return { success: true }
}

/** File data for a document that has already been uploaded through /api/upload. */
export type UploadedDocument = {
  url: string
  file_name: string
  content_type: string
  size: number
}

function documentBody(data: DocumentFormValues) {
  const { venture, document_date, ...rest } = data
  return { ...rest, venture: venture || null, document_date: document_date || null }
}

export async function createDocument(
  uploaded: UploadedDocument,
  data: DocumentFormValues
): Promise<HistoryActionState> {
  const parsed = documentFormSchema.safeParse(data)
  if (!parsed.success || !uploaded.url) {
    return { error: parsed.success ? "Dokumentet kunde inte sparas." : (parsed.error.issues[0]?.message ?? "Dokumentet kunde inte sparas.") }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.documents, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ house, ...uploaded, ...documentBody(parsed.data) }),
  })
  if (!response.ok) {
    return { error: "Dokumentet kunde inte sparas. Försök igen." }
  }

  const document: { id: string } = await response.json()
  revalidatePath(HISTORY_PATH)
  return { success: true, id: document.id }
}

export async function updateDocument(id: string, data: DocumentFormValues): Promise<HistoryActionState> {
  const parsed = documentFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dokumentet kunde inte sparas." }
  }

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.documents}${id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify(documentBody(parsed.data)),
  })
  if (!response.ok) {
    return { error: "Dokumentet kunde inte sparas. Försök igen." }
  }

  revalidatePath(HISTORY_PATH)
  return { success: true }
}

export async function deleteDocument(id: string): Promise<HistoryActionState> {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.documents}${id}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    return { error: "Dokumentet kunde inte tas bort. Försök igen." }
  }

  revalidatePath(HISTORY_PATH)
  return { success: true }
}

function relationBody(data: PersonRelationFormValues) {
  const { start_year, end_year, ...rest } = data
  return {
    ...rest,
    start_year: start_year ? Number(start_year) : null,
    end_year: end_year ? Number(end_year) : null,
  }
}

export async function createPersonRelation(data: PersonRelationFormValues): Promise<HistoryActionState> {
  const parsed = personRelationFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Relationen kunde inte sparas." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const response = await fetchOrigoApi(VERSO_ENDPOINTS.personRelations, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ house, ...relationBody(parsed.data) }),
  })
  if (!response.ok) {
    return { error: "Relationen kunde inte sparas. Den kanske redan finns." }
  }

  revalidatePath(HISTORY_PATH)
  return { success: true }
}

export async function deletePersonRelation(id: string): Promise<HistoryActionState> {
  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.personRelations}${id}/`, {
    method: "DELETE",
    headers: await authedJsonHeaders(),
  })
  if (!response.ok && response.status !== 404) {
    return { error: "Relationen kunde inte tas bort. Försök igen." }
  }

  revalidatePath(HISTORY_PATH)
  return { success: true }
}
