"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { VERSO_ENDPOINTS } from "@/app/lib/config"
import { fetchOrigoApi } from "@/app/lib/api-client"
import { authedJsonHeaders } from "@/app/lib/auth-headers"
import { resolveSelectedHouse } from "@/app/lib/selected-facility"
import { drawingFormSchema, type DrawingFormValues } from "@/app/lib/schemas"
import type { DrawingElement, DrawingPage, DrawingUnit } from "@/app/lib/dal"

/** Default page: 6 m x 4 m, expressed in the drawing's unit. */
const PAGE_SIZE_MM = { width: 6000, height: 4000 }
const UNIT_FROM_MM: Record<DrawingUnit, number> = { mm: 1, cm: 0.1, m: 0.001 }

function defaultPageSize(unit: DrawingUnit) {
  const factor = UNIT_FROM_MM[unit]
  return { width: PAGE_SIZE_MM.width * factor, height: PAGE_SIZE_MM.height * factor }
}

export type DrawingActionState = { error?: string; success?: boolean } | undefined

/** Creates a drawing with one empty page, then opens it in the editor. */
export async function createDrawing(data: DrawingFormValues): Promise<DrawingActionState> {
  const parsed = drawingFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Alla fält måste fyllas i." }
  }

  const house = await resolveSelectedHouse()
  if (!house) {
    return { error: "Ingen anläggning vald." }
  }

  const { venture, ...rest } = parsed.data
  const response = await fetchOrigoApi(VERSO_ENDPOINTS.drawings, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ house, venture: venture || null, ...rest }),
  })
  if (!response.ok) {
    return { error: "Ritningen kunde inte skapas. Försök igen." }
  }

  const drawing: { id: string } = await response.json()
  const pageResponse = await fetchOrigoApi(VERSO_ENDPOINTS.drawingPages, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({
      drawing: drawing.id,
      name: "Sida 1",
      order: 0,
      elements: [],
      ...defaultPageSize(parsed.data.unit),
    }),
  })
  if (!pageResponse.ok) {
    return { error: "Ritningen skapades men sidan kunde inte skapas. Öppna ritningen och försök igen." }
  }

  revalidatePath("/ritningar")
  redirect(`/ritningar/${drawing.id}`)
}

export async function addDrawingPage(
  drawing: string,
  name: string,
  order: number,
  unit: DrawingUnit
): Promise<DrawingActionState> {
  const response = await fetchOrigoApi(VERSO_ENDPOINTS.drawingPages, {
    method: "POST",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ drawing, name: name.trim() || `Sida ${order + 1}`, order, elements: [], ...defaultPageSize(unit) }),
  })
  if (!response.ok) {
    return { error: "Sidan kunde inte skapas. Försök igen." }
  }

  revalidatePath(`/ritningar/${drawing}`)
  return { success: true }
}

export async function saveDrawingPage(
  drawing: string,
  page: Pick<DrawingPage, "id" | "name" | "width" | "height">,
  elements: DrawingElement[]
): Promise<DrawingActionState> {
  if (!page.id) {
    return { error: "Sidan kunde inte hittas." }
  }

  const response = await fetchOrigoApi(`${VERSO_ENDPOINTS.drawingPages}${page.id}/`, {
    method: "PATCH",
    headers: await authedJsonHeaders(),
    body: JSON.stringify({ name: page.name, width: page.width, height: page.height, elements }),
  })
  if (!response.ok) {
    return { error: "Ritningen kunde inte sparas. Försök igen." }
  }

  revalidatePath(`/ritningar/${drawing}`)
  return { success: true }
}
