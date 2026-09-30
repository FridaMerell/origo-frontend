"use server"
import { bookmarkApi, textUnitApi } from "./actions"
import type { Bookmark, Id } from "@/app/lib/dal/opus"

/** Alla den inloggade användarens bokmärken i en edition (ingen paginering). */
export async function listBookmarks(editionId: Id): Promise<Bookmark[]> {
	return bookmarkApi.list({ version: String(editionId) })
}

export async function addBookmark(editionId: Id, unitId: Id): Promise<Bookmark> {
	return bookmarkApi.create({ version: editionId, unit: unitId })
}

export async function removeBookmark(id: Id): Promise<void> {
	await bookmarkApi.remove(id)
}

/** Alla den inloggade användarens bokmärken, i alla verk, nyast först. */
export async function listAllBookmarks(): Promise<Bookmark[]> {
	return bookmarkApi.list()
}

/** Byter ett bokmärkes rubrik och anteckning. */
export async function updateBookmark(id: Id, data: { title: string; note: string }): Promise<Bookmark> {
	return bookmarkApi.update(id, data)
}

export type WorkBookmark = {
	id: Id
	unitId: Id
	editionTitle: string
	label: string
	snippet: string
}

/**
 * Alla bokmärken i verkets editions, med utgåvans titel och en textsnutt, redo att visas i en
 * lista. En bokmärkt rad kan då peka ut samma stycke i vilken vy som helst (se
 * app/opus/_state/unit-navigation.ts).
 */
export async function listWorkBookmarks(editions: { id: Id; title: string }[]): Promise<WorkBookmark[]> {
	const perEdition = await Promise.all(
		editions.map(edition => bookmarkApi.list({ version: String(edition.id) }).then(list => ({ edition, list }))),
	)
	const flat = perEdition.flatMap(({ edition, list }) => list.map(bookmark => ({ edition, bookmark })))
	const withSnippets = await Promise.all(
		flat.map(async ({ edition, bookmark }) => {
			const unit = await textUnitApi.retrieve(bookmark.unit)
			return {
				id: bookmark.id,
				unitId: bookmark.unit,
				editionTitle: edition.title,
				label: unit.label || String(unit.position),
				snippet: unit.content.length > 90 ? `${unit.content.slice(0, 90)}…` : unit.content,
			}
		}),
	)
	return withSnippets
}
