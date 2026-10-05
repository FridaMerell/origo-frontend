"use server"
import { lexicalFormApi } from "./actions"
import type { Id, LexicalForm, LexicalFormCreate, LexicalFormUpdate } from "@/app/lib/dal/opus"

export async function createLexicalForm(data: LexicalFormCreate): Promise<LexicalForm> {
	return lexicalFormApi.create(data)
}

export async function updateLexicalForm(id: Id, data: LexicalFormUpdate): Promise<LexicalForm> {
	return lexicalFormApi.update(id, data)
}

export async function deleteLexicalForm(id: Id): Promise<void> {
	return lexicalFormApi.remove(id)
}
