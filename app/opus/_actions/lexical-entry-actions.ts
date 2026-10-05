"use server"
import { glossaryApi, lexicalEntryApi } from "./actions"
import type {
	Id,
	LexicalEntryCreate,
	LexicalEntryFilters,
	LexicalEntryUpdate,
	LexicalEntry,
	LexicalLanguage,
} from "@/app/lib/dal/opus"

/** Språken bland användarens egna ord. */
export async function listEntryLanguages(): Promise<LexicalLanguage[]> {
	return lexicalEntryApi.languages()
}

/** Ett nytt slumpat urval av användarens egna ord på ett språk för ett glosförhör. */
export async function getLanguageQuiz(language: string, count: number): Promise<LexicalEntry[]> {
	return lexicalEntryApi.quiz(language, count)
}

/** Ord användaren ser, t.ex. `{ lemma }` eller `{ forms__form__iexact }` för att hitta en grundform. */
export async function listLexicalEntries(filters: LexicalEntryFilters): Promise<LexicalEntry[]> {
	return lexicalEntryApi.list(filters)
}

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
