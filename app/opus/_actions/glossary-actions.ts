"use server"
import { glossaryApi } from "./actions"
import type { Glossary, GlossaryCreate, GlossaryDetail, GlossaryUpdate, Id } from "@/app/lib/dal/opus"

/** Alla ordlistor användaren ser: egna (även privata) och andras offentliga. */
export async function listGlossaries(): Promise<Glossary[]> {
	return glossaryApi.list()
}

export async function getGlossary(id: Id): Promise<GlossaryDetail> {
	return glossaryApi.retrieve(id)
}

export async function createGlossary(data: GlossaryCreate): Promise<GlossaryDetail> {
	return glossaryApi.create(data)
}

export async function updateGlossary(id: Id, data: GlossaryUpdate): Promise<GlossaryDetail> {
	return glossaryApi.update(id, data)
}

export async function deleteGlossary(id: Id): Promise<void> {
	return glossaryApi.remove(id)
}

export async function addGlossaryEntry(id: Id, entryId: Id): Promise<void> {
	return glossaryApi.addEntry(id, entryId)
}

export async function removeGlossaryEntry(id: Id, entryId: Id): Promise<void> {
	return glossaryApi.removeEntry(id, entryId)
}
