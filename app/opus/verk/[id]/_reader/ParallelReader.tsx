"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { AlignmentMatrix, Bookmark, Id } from "@/app/lib/dal/opus"
import {
	autoMatchAlignmentChapters,
	combineUnits,
	focusOnUnit,
	joinAlignmentCell,
	loadAlignmentRows,
	resetAlignment,
	shiftAlignmentCell,
	splitAlignmentCell,
} from "../../../_actions/alignment-actions"
import { deleteAnnotation, updateAnnotation } from "../../../_actions/annotation-actions"
import { useKeepPosition } from "../../../_state/opus-context"
import { useUnitNavigationListener } from "../../../_state/unit-navigation"
import { EDITION_COLORS, PAGE_SIZE } from "../_ui/editions"
import type { CellAction, CombineTarget } from "./Cell"
import type { EditionInfo } from "./ChapterSync"
import { visibleElement, type Column } from "./columns"
import MobileRows from "./MobileRows"
import Pager from "./Pager"
import ParallelTable from "./ParallelTable"
import SyncTools from "./SyncTools"
import { useSaveReadingPosition, useTopRow } from "./useReadingPosition"
import { useRowBookmarks } from "./useRowBookmarks"

// One shared empty list, so that a reader without bookmarks gets the same list every render.
const NO_BOOKMARKS: Bookmark[] = []

export default function ParallelReader({
	workId,
	initial,
	initialBookmarks = NO_BOOKMARKS,
	editions,
}: {
	/** För att spara läspositionen medan man scrollar. Utan den sparas ingenting. */
	workId?: Id
	initial: AlignmentMatrix
	/** Användarens bokmärken i referensutgåvan (den första kolumnen). */
	initialBookmarks?: Bookmark[]
	editions: EditionInfo[]
}) {
	const [matrix, setMatrix] = useState(initial)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [notice, setNotice] = useState<string | null>(null)
	// Raden vyn ska ta användaren till efter en kapitelsynk, i de rader (matrisen) den gäller.
	// När andra rader visas (t.ex. en annan sida) gäller den inte längre.
	const [focus, setFocus] = useState<{ row: number; matrix: AlignmentMatrix } | null>(() =>
		initial.focus_row == null ? null : { row: initial.focus_row, matrix: initial },
	)
	// Inställningen "Läs utan att uppdatera position" (bredvid Radera på verksidan).
	const [keepPosition] = useKeepPosition()
	const setId = initial.set.id

	// Sidan öppnas vid sparad läsposition (focus_row) och scrollar dit.
	const [shownInitial, setShownInitial] = useState(initial)
	if (shownInitial !== initial) {
		setShownInitial(initial)
		setMatrix(initial)
		setFocus(initial.focus_row == null ? null : { row: initial.focus_row, matrix: initial })
	}

	const columns: Column[] = useMemo(
		() =>
			matrix.versions.map((version, index) => {
				const edition = editions.find(edition => edition.id === version.text_version)
				return {
					versionId: version.id,
					editionId: version.text_version,
					title: edition?.title ?? version.label,
					color: EDITION_COLORS[index] ?? "foreground",
					language: edition?.language ?? "sv",
				}
			}),
		[matrix.versions, editions],
	)

	// Kapitelsynk jämför utgåvor mot varandra; med en enda kolumn finns inget att synka.
	const canSync = columns.length >= 2

	// Fönstret som redigeringar ska returnera: samma rader som visas nu.
	const limit = PAGE_SIZE
	const view = { offset: matrix.offset, limit }

	const topRow = useTopRow(matrix.rows)
	useSaveReadingPosition(matrix.rows, columns, workId, keepPosition)
	const bookmarkButton = useRowBookmarks(initialBookmarks, columns, setError)

	// Efter en kapitelsynk: ta användaren till kapitlet de valde.
	function handleSynced(next: AlignmentMatrix) {
		setMatrix(next)
		setError(null)
		const gaps = next.result?.inserted_gaps ?? 0
		const row = (next.result?.row ?? 0) + 1
		setNotice(
			gaps === 0
				? `Sparat: kapitlen låg redan i synk (rad ${row}). Läspositionen är flyttad.`
				: `Sparat: ${gaps} luckor inlagda. Läspositionen är flyttad till rad ${row}.`,
		)
		setFocus(next.result?.row == null ? null : { row: next.result.row, matrix: next })
	}

	useEffect(() => {
		if (!focus || focus.matrix !== matrix) return
		const element = visibleElement(`[data-position="${focus.row}"]`)
		if (!element) return
		// scrollIntoView("start") skjuter raden bakom både TopBar (sticky top-0) och läsvyns
		// egen rubrik (sticky top-[61px]); dra bort deras sammanlagda höjd ur målet.
		const header = visibleElement("[data-reader-header]")
		const stickyOffset = 61 + (header?.getBoundingClientRect().height ?? 0)
		const top = window.scrollY + element.getBoundingClientRect().top - stickyOffset
		window.scrollTo({ top, behavior: "smooth" })
	}, [focus, matrix])

	// Klick på ett kapitel i en utgåvas index (se app/opus/_state/unit-navigation.ts) hoppar hit.
	useUnitNavigationListener(
		useCallback(
			async (unitId: Id) => {
				setBusy(true)
				setError(null)
				setNotice(null)
				try {
					const next = await focusOnUnit(setId, unitId, limit)
					setMatrix(next)
					if (next.focus_row == null) {
						setError("Det kapitlet finns inte i det här verkets parallella vy.")
					} else {
						setFocus({ row: next.focus_row, matrix: next })
					}
				} catch {
					setError("Kunde inte hoppa till kapitlet.")
				} finally {
					setBusy(false)
				}
			},
			[setId, limit],
		),
	)

	// Redigeringar är atomära på servern och returnerar de rader som visas; vid fel är
	// servern oförändrad och vi visar bara felet.
	const run = useCallback(async (call: () => Promise<AlignmentMatrix>) => {
		setBusy(true)
		setError(null)
		try {
			setMatrix(await call())
		} catch (e) {
			// Next döljer serverfelets text i produktion; i dev får vi backendens svar.
			const detail = e instanceof Error ? e.message.slice(0, 300) : ""
			setError(`Ändringen kunde inte sparas. Ingenting har ändrats.${detail ? ` (${detail})` : ""}`)
		} finally {
			setBusy(false)
		}
	}, [])

	// Ändringar i själva texten (redigera, dela, ta bort stycke, annotationer) ändrar raderna.
	const reload = useCallback(
		() => run(() => loadAlignmentRows(setId, matrix.offset, limit)),
		[run, setId, matrix.offset, limit],
	)

	function handleAction(action: CellAction, versionId: Id, row: number, target?: CombineTarget) {
		if (busy) return
		setNotice(null)
		if (action === "combine" && target) {
			run(async () => {
				const result = await combineUnits(target.unitId, target.count)
				if (result.error) throw new Error(result.error)
				return loadAlignmentRows(setId, matrix.offset, limit)
			})
		} else if (action === "insert_gap" || action === "remove_gap") {
			run(() => shiftAlignmentCell(setId, versionId, row, action, view))
		} else if (action === "join") {
			run(() => joinAlignmentCell(setId, versionId, row, view))
		} else {
			run(() => splitAlignmentCell(setId, versionId, row, view))
		}
	}

	// Paginering som i en bok: servern delar in raderna i sidor där varje kapitel börjar på en
	// ny sida (`pages` = varje sidas första rad). Utan `pages` blir det jämna sidor om PAGE_SIZE.
	const pageStarts =
		matrix.pages && matrix.pages.length > 0
			? matrix.pages
			: Array.from({ length: Math.max(1, Math.ceil(matrix.total_rows / PAGE_SIZE)) }, (_, index) => index * PAGE_SIZE)
	const totalPages = pageStarts.length
	const page = Math.max(1, pageStarts.findLastIndex(start => start <= matrix.offset) + 1)

	async function goToPage(target: number) {
		const next = Math.min(Math.max(1, target), totalPages)
		if (busy || next === page) return
		setNotice(null)
		setFocus(null)
		await run(() => loadAlignmentRows(setId, pageStarts[next - 1], PAGE_SIZE))
		visibleElement("[data-reader-start]")?.scrollIntoView({ block: "start", behavior: "smooth" })
	}

	async function syncChapters() {
		if (busy) return
		setBusy(true)
		setError(null)
		setNotice(null)
		try {
			const next = await autoMatchAlignmentChapters(setId, view)
			setMatrix(next)
			const result = next.result
			setNotice(
				!result || result.aligned_chapters === 0
					? "Hittade inga kapitel att radar upp: editionerna har inga matchande kapitel."
					: `Radade upp ${result.aligned_chapters} kapitel (${result.inserted_gaps} luckor inlagda).`,
			)
		} catch {
			setError("Kapitelsynken kunde inte genomföras. Ingenting har ändrats.")
		} finally {
			setBusy(false)
		}
	}

	function resetRows() {
		if (busy || !window.confirm("Börja om? All manuell synkning för det här verket tas bort.")) return
		setNotice(null)
		run(() => resetAlignment(setId, { offset: 0, limit: PAGE_SIZE }))
	}

	async function handleDeleteAnnotation(annotationId: Id) {
		try {
			await deleteAnnotation(annotationId)
			await reload()
		} catch {
			setError("Noten kunde inte tas bort.")
		}
	}

	async function handleEditAnnotation(annotationId: Id, body: string) {
		try {
			await updateAnnotation(annotationId, { body })
			await reload()
		} catch {
			setError("Noten kunde inte sparas.")
		}
	}

	const pager = (
		<Pager
			page={page}
			totalPages={totalPages}
			offset={matrix.offset}
			rowCount={matrix.rows.length}
			totalRows={matrix.total_rows}
			busy={busy}
			onGo={goToPage}
		/>
	)

	return (
		<>
			<SyncTools
				error={error}
				notice={notice}
				busy={busy}
				disabled={busy || matrix.total_rows === 0 || !canSync}
				setId={setId}
				columns={columns}
				editions={editions}
				limit={limit}
				onSyncChapters={syncChapters}
				onApplied={handleSynced}
				onReset={resetRows}
			/>

			{matrix.total_rows > 0 && pager}

			{matrix.total_rows > 0 && (
				<MobileRows
					rows={matrix.rows}
					columns={columns}
					busy={busy}
					renderBookmark={bookmarkButton}
					onAction={handleAction}
					onChanged={reload}
					onDeleteNote={handleDeleteAnnotation}
					onEditNote={handleEditAnnotation}
				/>
			)}

			{matrix.total_rows === 0 ? (
				<p className='py-10 text-text'>Inga stycken att visa.</p>
			) : (
				<ParallelTable
					rows={matrix.rows}
					columns={columns}
					topRow={topRow}
					busy={busy}
					renderBookmark={bookmarkButton}
					onAction={handleAction}
					onChanged={reload}
					onDeleteNote={handleDeleteAnnotation}
					onEditNote={handleEditAnnotation}
				/>
			)}
			{matrix.total_rows > 0 && pager}
		</>
	)
}
