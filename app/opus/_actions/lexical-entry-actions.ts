"use server"
import { glossaryApi, lexicalEntryApi } from "./actions"
import type { Id, LexicalEntryCreate, LexicalEntryUpdate, LexicalEntry } from "@/app/lib/dal/opus"

export async function createLexicalEntry(data: LexicalEntryCreate): Promise<LexicalEntry> {
	return lexicalEntryApi.create(data)
}

export async function getLexicalEntry(id: Id): Promise<LexicalEntry> {
	return lexicalEntryApi.retrieve(id)
}

export async function updateLexicalEntry(id: Id, data: LexicalEntryUpdate): Promise<LexicalEntry> {
	return lexicalEntryApi.update(id, data)
}

export async function deleteLexicalEntry(id: Id): Promise<void> {
	return lexicalEntryApi.remove(id)
}

/** Lägger ordet i precis de av användarens ordlistor som anges i `next`. */
export async function setEntryGlossaries(entryId: Id, current: Id[], next: Id[]): Promise<void> {
	await Promise.all([
		...next.filter(id => !current.includes(id)).map(id => glossaryApi.addEntry(id, entryId)),
		...current.filter(id => !next.includes(id)).map(id => glossaryApi.removeEntry(id, entryId)),
	])
}
