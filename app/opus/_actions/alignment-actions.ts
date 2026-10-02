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

/** `error` är serverns förklaring när ändringen nekades (t.ex. 400 för ett stycke med annotationer). */
export type UnitEditResult = { error?: string }

/**
 * Kör en redigering och returnerar felet i stället för att kasta det: ett fel som kastas ur en
 * server action når klienten utan meddelande i produktion (React-fel #441).
 */
async function asResult(edit: () => Promise<unknown>): Promise<UnitEditResult> {
	try {
		await edit()
		return {}
	} catch (error) {
		return { error: errorDetail(error) }
	}
}

/** Första meddelandet ur DRF:s felsvar (`{"detail": …}` eller `{"fält": […]}`); annars ett allmänt fel. */
function errorDetail(error: unknown): string {
	const body = (error instanceof Error ? error.message : "").replace(/^\d+\s[^:]*:\s*/, "")
	try {
		const first = Object.values(JSON.parse(body) as Record<string, unknown>).flat()[0]
		if (typeof first === "string") return first
	} catch {
		// Inte JSON (t.ex. en HTML-sida vid serverfel): visa inte råtexten.
	}
	return "Ändringen kunde inte sparas."
}

/** Redigerar ett stycke. Servern nekar (400) om stycket har annotationer. */
export async function updateUnitContent(unitId: Id, content: string): Promise<UnitEditResult> {
	return asResult(() => textUnitApi.update(unitId, { content }))
}

/** Tar bort ett stycke (t.ex. en kapitelrubrik som hamnat i brödtexten). */
export async function deleteUnit(unitId: Id): Promise<UnitEditResult> {
	return asResult(() => textUnitApi.remove(unitId))
}

/**
 * Kombinerar stycket med de `count` som följer till ett enda stycke (permanent). Annotationer,
 * bokmärken och utdrag flyttas till det kombinerade stycket.
 */
export async function combineUnits(unitId: Id, count = 1): Promise<UnitEditResult> {
	return asResult(() => textUnitApi.mergeNext(unitId, count))
}

/** Delar ett stycke vid teckenpositionen `offset`. Servern nekar (400) om stycket har annotationer. */
export async function splitUnit(unitId: Id, offset: number): Promise<UnitEditResult> {
	return asResult(() => textUnitApi.split(unitId, offset))
}
