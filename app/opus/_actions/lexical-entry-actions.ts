"use server"
import { lexicalEntryApi } from "./actions"
import type { LexicalEntryCreate, LexicalEntry } from "@/app/lib/dal/opus"

export async function createLexicalEntry(data: LexicalEntryCreate): Promise<LexicalEntry> {
	return lexicalEntryApi.create(data)
}
