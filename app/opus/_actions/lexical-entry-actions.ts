"use server"
import { glossaryApi, lexicalEntryApi } from "./actions"
import { GLOSSARY_PAGE_SIZE } from "../ordlistor/lexical-forms"
import type {
	Id,
	LexicalEntryCreate,
	LexicalEntryFilters,
	LexicalEntryUpdate,
	LexicalEntry,
	LexicalEntryPage,
	LexicalLanguage,
} from "@/app/lib/dal/opus"

/** Språken bland användarens egna ord. */
export async function listEntryLanguages(): Promise<LexicalLanguage[]> {
	return lexicalEntryApi.languages()
}

/** Ett nytt slumpat urval av användarens egna ord på ett språk för ett glosförhör; med `marked` bara bland de markerade. */
export async function getLanguageQuiz(language: string, count: number, marked: boolean): Promise<LexicalEntry[]> {
	return lexicalEntryApi.quiz(language, count, marked)
}

/** Markerar ordet för användarens glosförhör, eller tar bort markeringen. */
export async function setQuizMark(id: Id, marked: boolean): Promise<void> {
	return lexicalEntryApi.setQuizMark(id, marked)
}

/** En sida av orden användaren ser, t.ex. `{ search }` eller `{ glossaries }` för orden i en ordlista. */
export async function listLexicalEntries(filters: LexicalEntryFilters): Promise<LexicalEntryPage> {
	return lexicalEntryApi.list(filters)
}

/** En sida av orden i en ordlista, i bokstavsordning; `search` söker bland dem i API:t. */
export async function listGlossaryEntries(glossaryId: Id, page = 1, search = ""): Promise<LexicalEntryPage> {
	return lexicalEntryApi.list({
		glossaries: String(glossaryId),
		page: String(page),
		page_size: String(GLOSSARY_PAGE_SIZE),
		search: search.trim() || undefined,
	})
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
