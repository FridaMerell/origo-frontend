"use server"

import { revalidatePath } from "next/cache"
import { editionApi, workApi } from "./actions"
import { ensureAlignmentSet } from "./alignment-bootstrap"
import type { EditionCreate } from "@/app/lib/dal/opus"

// The file (if any) is deliberately NOT part of this action's FormData: Server
// Actions are capped at a 1 MB request body by default, which a document import
// blows past immediately. The client uploads the file separately, after this
// action returns the new edition's id, via the existing import-document route.
export type CreateEditionState = { error?: string; success?: boolean; editionId?: number }

/** Raderar en utgåva med all dess text; dess kolumn i läsvyn försvinner med den. */
export async function deleteEdition(workId: number, editionId: number): Promise<{ error?: string }> {
	try {
		await editionApi.remove(editionId)
	} catch (error) {
		const forbidden = error instanceof Error && error.message.startsWith("403")
		return { error: forbidden ? "Bara verkets ägare kan radera en utgåva." : "Utgåvan kunde inte raderas." }
	}
	revalidatePath(`/opus/verk/${workId}`)
	return {}
}

export async function createEdition(
	workId: number,
	_previousState: CreateEditionState,
	formData: FormData,
): Promise<CreateEditionState> {
	const title = String(formData.get("title") ?? "").trim()
	const customLanguage = String(formData.get("customLanguage") ?? "").trim()
	const language = customLanguage || String(formData.get("language") ?? "").trim()
	const edition = String(formData.get("edition") ?? "").trim()
	const source = String(formData.get("source") ?? "").trim()

	if (!title) return { error: "Ange en titel för utgåvan." }
	if (!language) return { error: "Ange språk för utgåvan." }

	const data: EditionCreate = {
		work: workId,
		title,
		language,
		edition: edition || undefined,
		source: source || undefined,
	}

	try {
		const created = await editionApi.create(data)
		const work = await workApi.retrieve(workId)
		// Även en ensam utgåva behöver ett set: läsvyn är rutnätet, med en kolumn per utgåva.
		await ensureAlignmentSet(
			workId,
			work.title,
			work.editions.map(edition => ({ id: edition.id, title: edition.title })),
		)
		revalidatePath(`/opus/verk/${workId}`)
		return { success: true, editionId: created.id }
	} catch {
		return { error: "Utgåvan kunde inte skapas. Försök igen." }
	}
}
