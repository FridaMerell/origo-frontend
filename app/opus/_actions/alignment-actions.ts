"use server"
import { alignmentSetApi, readingProgressApi, textUnitApi } from "./actions"
import type { AlignmentMatrix, AlignmentShiftAction, Id } from "@/app/lib/dal/opus"

/**
 * Parallellt rutnät (Flux "Origo Opus" — Alignment-API: detaljkontrakt).
 * Cellen identifieras av edition (`versionId`) + rad (`row`). Varje redigering är atomär på
 * servern och returnerar raderna `offset`..`offset + limit`, så klienten ersätter sina rader
 * med svaret.
 */

type Window = { offset: number; limit: number }

export async function loadAlignmentRows(setId: Id, offset: number, limit: number): Promise<AlignmentMatrix> {
	return alignmentSetApi.matrix(setId, offset, limit)
}

/** Hoppar till raden för ett stycke eller kapitel (t.ex. valt i en utgåvas kapitelindex). */
export async function focusOnUnit(setId: Id, unitId: Id, limit: number): Promise<AlignmentMatrix> {
	return alignmentSetApi.matrix(setId, 0, limit, undefined, unitId)
}

export async function resetAlignment(setId: Id, window: Window): Promise<AlignmentMatrix> {
	return alignmentSetApi.reset(setId, window)
}

export async function shiftAlignmentCell(
	setId: Id,
	versionId: Id,
	row: number,
	action: AlignmentShiftAction,
	window: Window,
): Promise<AlignmentMatrix> {
	return alignmentSetApi.shift(setId, { alignment_version: versionId, row, action, ...window })
}

export async function joinAlignmentCell(
	setId: Id,
	versionId: Id,
	row: number,
	window: Window,
): Promise<AlignmentMatrix> {
	return alignmentSetApi.join(setId, { alignment_version: versionId, row, ...window })
}

export async function splitAlignmentCell(
	setId: Id,
	versionId: Id,
	row: number,
	window: Window,
): Promise<AlignmentMatrix> {
	return alignmentSetApi.split(setId, { alignment_version: versionId, row, ...window })
}

export async function autoMatchAlignmentChapters(setId: Id, window: Window): Promise<AlignmentMatrix> {
	return alignmentSetApi.autoMatchChapters(setId, window)
}

/**
 * Uppdaterar läspositionen (ReadingProgress) medan man bläddrar/scrollar i rutnätet, så att
 * "Fortsätt" pekar dit man faktiskt är, inte bara dit en kapitelsynk senast tog en.
 */
export async function updateReadingPosition(workId: Id, position: number): Promise<void> {
	await readingProgressApi.update(workId, { position })
}

/**
 * Manuell kapitelsynk: varje grupp är ett kapitel (eller stycke) per edition som ska hamna på
 * samma rad. `dryRun` räknar bara ut planen (`result.groups`) utan att spara något.
 */
export async function alignTexts(
	setId: Id,
	groups: { alignment_version: Id; unit: Id }[][],
	window: Window,
	dryRun = false,
): Promise<AlignmentMatrix> {
	return alignmentSetApi.align(setId, groups, window, dryRun)
}

/** Redigerar ett stycke. Servern nekar (400) om stycket har annotationer. */
export async function updateUnitContent(unitId: Id, content: string): Promise<void> {
	await textUnitApi.update(unitId, { content })
}

/** Tar bort ett stycke (t.ex. en kapitelrubrik som hamnat i brödtexten). */
export async function deleteUnit(unitId: Id): Promise<void> {
	await textUnitApi.remove(unitId)
}

/**
 * Kombinerar stycket med de `count` som följer till ett enda stycke (permanent). Annotationer,
 * bokmärken och utdrag flyttas till det kombinerade stycket.
 */
export async function combineUnits(unitId: Id, count = 1): Promise<void> {
	await textUnitApi.mergeNext(unitId, count)
}

/** Delar ett stycke vid teckenpositionen `offset`. Servern nekar (400) om stycket har annotationer. */
export async function splitUnit(unitId: Id, offset: number): Promise<void> {
	await textUnitApi.split(unitId, offset)
}
