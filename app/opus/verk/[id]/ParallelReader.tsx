"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bookmark as BookmarkIcon, WandSparklesIcon } from "lucide-react"
import type { AlignmentCell, AlignmentMatrix, AlignmentRow, Bookmark, Id } from "@/app/lib/dal/opus"
import {
	autoMatchAlignmentChapters,
	combineUnits,
	focusOnUnit,
	updateReadingPosition,
	joinAlignmentCell,
	loadAlignmentRows,
	resetAlignment,
	shiftAlignmentCell,
	splitAlignmentCell,
} from "../../_actions/alignment-actions"
import { useUnitNavigationListener } from "../../_state/unit-navigation"
import { useKeepPosition } from "../../_state/opus-context"
import { addBookmark, removeBookmark } from "../../_actions/bookmark-actions"
import AnnotationColumn from "./AnnotationColumn"
import { TextField } from "../../forms/Fields/Fields"
import { deleteAnnotation } from "../../_actions/annotation-actions"
import ChapterSync, { type EditionInfo } from "./ChapterSync"
import Menu from "./Menu"
import UnitText from "./UnitText"

/** Antal rader per sida. Servern snappar fönstret till sidgränser med samma `limit`. */
const PAGE_SIZE = 10
const COLUMN_COLORS = ["primary", "secondary", "accent", "foreground"]
const BAR_CLASS: Record<string, string> = {
	primary: "bg-primary",
	secondary: "bg-secondary",
	accent: "bg-accent",
	foreground: "bg-foreground",
}
const BORDER_CLASS: Record<string, string> = {
	primary: "border-l-primary/50 group-hover/row:border-l-primary",
	secondary: "border-l-secondary/50 group-hover/row:border-l-secondary",
	accent: "border-l-accent/50 group-hover/row:border-l-accent",
	foreground: "border-l-foreground/50 group-hover/row:border-l-foreground",
}

const LEFT_BORDER: Record<string, string> = {
	primary: "border-l-primary",
	secondary: "border-l-secondary",
	accent: "border-l-accent",
	foreground: "border-l-foreground",
}

type Column = { versionId: Id; editionId: Id; title: string; color: string }

type CellAction = "insert_gap" | "remove_gap" | "join" | "split" | "combine"
/** Bara för "combine": första stycket i cellen och hur många som ska slås ihop med det. */
type CombineTarget = { unitId: Id; count: number }

function Cell({
	cell,
	above,
	below,
	row,
	column,
	busy,
	onAction,
	onChanged,
}: {
	cell: AlignmentCell
	above: AlignmentCell | null
	below: AlignmentCell | null
	row: number
	column: Column
	busy: boolean
	onAction: (action: CellAction, versionId: Id, row: number, target?: CombineTarget) => void
	onChanged: () => void
}) {
	const versionId = column.versionId
	const border = BORDER_CLASS[column.color] ?? BORDER_CLASS.foreground
	const empty = cell.kind !== "text"

	return (
		<div
			className={`group/cell relative h-full min-h-16 border-r border-b border-border border-l-5 px-3 py-4 duration-200 ${border} ${
				empty ? "bg-text/[0.03]" : ""
			}`}>
			{cell.kind !== "end" && (
				// Cellmenyn ligger nere till höger så att den inte krockar med styckenas egna meny.
				<div className='absolute bottom-1 right-1 z-10'>
					<Menu
						ariaLabel='Flytta eller sammanfoga cellen'
						disabled={busy}
						triggerClassName='rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text opacity-0 transition-opacity hover:border-text/40 focus-visible:opacity-100 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100 aria-expanded:opacity-100 cursor-pointer'
						trigger={<span aria-hidden>Cell ▾</span>}
						items={
							cell.kind === "gap"
								? [
										{
											label: "Ta bort luckan",
											hint: "Texten nedanför flyttas upp en rad",
											onSelect: () => onAction("remove_gap", versionId, row),
										},
									]
								: [
										{
											label: "Skjut ned härifrån",
											hint: "Lägger in en lucka ovanför; cellen och allt under flyttas ned en rad",
											onSelect: () => onAction("insert_gap", versionId, row),
										},
										{
											label: "Dra upp",
											hint: "Tar bort luckan ovanför; cellen och allt under flyttas upp en rad",
											disabled: above?.kind !== "gap",
											onSelect: () => onAction("remove_gap", versionId, row - 1),
										},
										"separator",
										{
											label: "Sammanfoga med cellen under",
											hint: "Visas som en cell; texten och styckena är kvar",
											disabled: below?.kind !== "text",
											onSelect: () => onAction("join", versionId, row),
										},
										{
											label: "Dela upp sammanfogad cell",
											hint: "Det sista stycket blir en egen cell",
											disabled: cell.units.length < 2,
											onSelect: () => onAction("split", versionId, row),
										},
										{
											label: "Kombinera stycken till ett",
											hint: "Slår ihop cellens stycken till ett enda stycke, permanent",
											disabled: cell.units.length < 2,
											onSelect: () => {
												if (window.confirm("Kombinera cellens stycken till ett enda stycke? Texterna slås ihop permanent."))
													onAction("combine", versionId, row, {
														unitId: cell.units[0].id,
														count: cell.units.length - 1,
													})
											},
										},
									]
						}
					/>
				</div>
			)}
			{empty ? (
				<span className='select-none font-mono text-xs text-text-faint'>{cell.kind === "gap" ? "—" : ""}</span>
			) : (
				<div className='flex flex-col gap-3'>
					{cell.units.map(unit => (
						<UnitText key={unit.id} unit={unit} label={unit.label || unit.position} onChanged={onChanged} />
					))}
				</div>
			)}
		</div>
	)
}

/** Sidnavigering: första/föregående/nästa/sista och hopp till en viss sida. */
function Pager({
	page,
	totalPages,
	offset,
	rowCount,
	totalRows,
	busy,
	onGo,
}: {
	page: number
	totalPages: number
	offset: number
	rowCount: number
	totalRows: number
	busy: boolean
	onGo: (page: number) => void
}) {
	const [draft, setDraft] = useState(String(page))
	useEffect(() => setDraft(String(page)), [page])
	const button =
		'rounded border border-border px-3 py-1.5 text-sm text-text hover:border-text/40 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
	return (
		<nav aria-label='Sidor' className='flex flex-wrap items-center justify-center gap-2 py-3 text-sm text-text'>
			<button type='button' className={button} disabled={busy || page <= 1} onClick={() => onGo(1)}>
				« Första
			</button>
			<button type='button' className={button} disabled={busy || page <= 1} onClick={() => onGo(page - 1)}>
				‹ Föregående
			</button>
			<form
				className='flex items-center gap-2'
				onSubmit={event => {
					event.preventDefault()
					const target = Number.parseInt(draft, 10)
					if (Number.isFinite(target)) onGo(target)
				}}>
				<span>Sida</span>
				<TextField
					label='Sidnummer'
					hideLabel
					type='number'
					min={1}
					max={totalPages}
					value={draft}
					onChange={event => setDraft(event.target.value)}
					className='!w-20 !py-1.5 text-center'
				/>
				<span>av {totalPages}</span>
			</form>
			<button type='button' className={button} disabled={busy || page >= totalPages} onClick={() => onGo(page + 1)}>
				Nästa ›
			</button>
			<button type='button' className={button} disabled={busy || page >= totalPages} onClick={() => onGo(totalPages)}>
				Sista »
			</button>
			<span className='basis-full text-center text-xs text-text/80'>
				Rad {offset + 1}–{offset + rowCount} av {totalRows}
			</span>
		</nav>
	)
}

export default function ParallelReader({
	workId,
	initial,
	initialBookmarks = [],
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
	// Raden vyn ska ta användaren till efter en kapitelsynk.
	const [focusRow, setFocusRow] = useState<number | null>(null)
	// Bokmärkta styckens id i referensutgåvan (den första kolumnen), mappat till bokmärkets id.
	const [bookmarks, setBookmarks] = useState<Record<Id, Id>>(() =>
		Object.fromEntries(initialBookmarks.map(bookmark => [bookmark.unit, bookmark.id])),
	)
	const [bookmarkBusy, setBookmarkBusy] = useState<Id | null>(null)
	// Inställningen "Läs utan att uppdatera position" (bredvid Radera på verksidan).
	const [keepPosition] = useKeepPosition()
	const setId = initial.set.id

	// Sidan öppnas vid sparad läsposition (focus_row) och scrollar dit.
	useEffect(() => {
		setMatrix(initial)
		setFocusRow(initial.focus_row ?? null)
	}, [initial])

	useEffect(() => {
		setBookmarks(Object.fromEntries(initialBookmarks.map(bookmark => [bookmark.unit, bookmark.id])))
	}, [initialBookmarks])

	const columns: Column[] = useMemo(
		() =>
			matrix.versions.map((version, index) => ({
				versionId: version.id,
				editionId: version.text_version,
				title: editions.find(edition => edition.id === version.text_version)?.title ?? version.label,
				color: COLUMN_COLORS[index] ?? "foreground",
			})),
		[matrix.versions, editions],
	)

	// Kapitelsynk jämför utgåvor mot varandra; med en enda kolumn finns inget att synka.
	const canSync = columns.length >= 2

	// Fönstret som redigeringar ska returnera: samma rader som visas nu.
	const limit = PAGE_SIZE
	const view = { offset: matrix.offset, limit }

	// Sparar läspositionen medan man scrollar, minst var 3:e rad, så "Fortsätt" pekar rätt.
	const lastSentRowRef = useRef<number | null>(null)
	useEffect(() => {
		if (!workId || keepPosition) return
		lastSentRowRef.current = null
		const referenceVersionId = columns[0]?.versionId
		const elements = matrix.rows
			.map(row => {
				const element = document.querySelector<HTMLElement>(`[data-position="${row.row}"]`)
				return element ? { row, element } : null
			})
			.filter((entry): entry is { row: AlignmentRow; element: HTMLElement } => entry !== null)
		if (referenceVersionId == null || elements.length === 0) return

		// "Läsraden" är den rad som ligger i ett smalt band nära toppen av skärmen.
		const observer = new IntersectionObserver(
			entries => {
				const visible = entries
					.filter(entry => entry.isIntersecting)
					.map(entry => elements.find(item => item.element === entry.target))
					.filter((item): item is { row: AlignmentRow; element: HTMLElement } => item !== undefined)
				if (visible.length === 0) return
				const topRow = visible.reduce((min, item) => (item.row.row < min.row.row ? item : min))
				const last = lastSentRowRef.current
				if (last !== null && Math.abs(topRow.row.row - last) < 3) return
				const cell = topRow.row.cells.find(c => c.alignment_version === referenceVersionId)
				const position = cell?.units[0]?.position
				if (position == null) return
				lastSentRowRef.current = topRow.row.row
				updateReadingPosition(workId, position).catch(() => {})
			},
			{ rootMargin: "-15% 0px -75% 0px", threshold: 0 },
		)
		elements.forEach(({ element }) => observer.observe(element))
		return () => observer.disconnect()
	}, [matrix.rows, columns, workId, keepPosition])

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
		setFocusRow(next.result?.row ?? null)
	}

	useEffect(() => {
		if (focusRow == null) return
		const element = document.querySelector<HTMLElement>(`[data-position="${focusRow}"]`)
		if (!element) return
		// scrollIntoView("start") skjuter raden bakom både TopBar (sticky top-0) och tabellens
		// egen kolumnrubrik (sticky top-[61px]); dra bort deras sammanlagda höjd ur målet.
		const header = document.querySelector<HTMLElement>("article header")
		const stickyOffset = 61 + (header?.getBoundingClientRect().height ?? 0)
		const top = window.scrollY + element.getBoundingClientRect().top - stickyOffset
		window.scrollTo({ top, behavior: "smooth" })
		setFocusRow(null)
	}, [focusRow, matrix])

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
						setFocusRow(next.focus_row)
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

	// Bokmärke på referensutgåvans (första kolumnens) stycke för en rad. Rader utan text i den
	// kolumnen (luckor) kan inte bokmärkas.
	function referenceUnit(row: AlignmentRow) {
		const referenceVersionId = columns[0]?.versionId
		const cell = row.cells.find(c => c.alignment_version === referenceVersionId)
		return cell?.kind === "text" ? cell.units[0] : null
	}

	async function toggleBookmark(row: AlignmentRow) {
		const unit = referenceUnit(row)
		const editionId = columns[0]?.editionId
		if (!unit || editionId == null || bookmarkBusy != null) return
		setBookmarkBusy(unit.id)
		setError(null)
		const existing = bookmarks[unit.id]
		try {
			if (existing) {
				await removeBookmark(existing)
				setBookmarks(prev => {
					const next = { ...prev }
					delete next[unit.id]
					return next
				})
			} else {
				const created = await addBookmark(editionId, unit.id)
				setBookmarks(prev => ({ ...prev, [unit.id]: created.id }))
			}
		} catch {
			setError("Bokmärket kunde inte sparas.")
		} finally {
			setBookmarkBusy(null)
		}
	}

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
				await combineUnits(target.unitId, target.count)
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

	// Paginering: en sida i taget (PAGE_SIZE rader), hämtad från servern.
	const totalPages = Math.max(1, Math.ceil(matrix.total_rows / PAGE_SIZE))
	const page = Math.floor(matrix.offset / PAGE_SIZE) + 1

	async function goToPage(target: number) {
		const next = Math.min(Math.max(1, target), totalPages)
		if (busy || next === page) return
		setNotice(null)
		setFocusRow(null)
		await run(() => loadAlignmentRows(setId, (next - 1) * PAGE_SIZE, PAGE_SIZE))
		document.querySelector("article")?.scrollIntoView({ block: "start", behavior: "smooth" })
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

	async function handleDeleteAnnotation(annotationId: Id) {
		try {
			await deleteAnnotation(annotationId)
			await reload()
		} catch {
			setError("Noten kunde inte tas bort.")
		}
	}

	const editionTitle = (versionId: Id) => columns.find(column => column.versionId === versionId)?.title ?? ""

	const annotationRows = matrix.rows.flatMap((row: AlignmentRow) => {
		const annotations = row.cells.flatMap(cell =>
			cell.units.flatMap(unit =>
				unit.annotations
					.filter(annotation => annotation.kind !== "definition")
					.map(annotation => ({
						annotation,
						editionTitle: editionTitle(cell.alignment_version),
						label: row.row + 1,
					})),
			),
		)
		return annotations.length ? [{ position: row.row, annotations }] : []
	})

	return (
		<>
			<div className='flex flex-wrap items-center justify-end gap-3 pb-3'>
				{error && <span className='mr-auto text-sm text-primary'>{error}</span>}
				{!error && notice && <span className='mr-auto text-sm text-text'>{notice}</span>}
				{busy && <span className='font-mono text-xs text-text'>Sparar…</span>}
				<button
					type='button'
					disabled={busy || matrix.total_rows === 0 || !canSync}
					onClick={syncChapters}
					className='inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm hover:border-text/40 disabled:opacity-40 cursor-pointer'>
					<WandSparklesIcon size={14} />
					Synka kapitel automatiskt
				</button>
				{/* Kapitelsynk i en popup: välj, granska planen och applicera (sparar). */}
				<ChapterSync
					setId={setId}
					columns={columns}
					editions={editions}
					limit={limit}
					disabled={busy || matrix.total_rows === 0 || !canSync}
					onApplied={handleSynced}
				/>
				<button
					type='button'
					disabled={busy}
					onClick={resetRows}
					className='rounded border border-border px-3 py-1.5 text-sm text-text hover:border-text/40 disabled:opacity-40 cursor-pointer'>
					Börja om
				</button>
			</div>

			{matrix.total_rows > 0 && pager}

			{/* Mobil: tabellen får inte plats, så varje rad visas som ett kort med en block per utgåva (endast läsning). */}
			{matrix.total_rows > 0 && (
				<div className='lg:hidden flex flex-col gap-4'>
					{matrix.rows.map(row => (
						<section key={row.row} className='rounded border border-border bg-surface'>
							<h3 className='border-b border-border px-3 py-2 font-mono text-xs uppercase tracking-widest text-text/80'>
								Rad {row.row + 1}
							</h3>
							{row.cells.map((cell, columnIndex) =>
								cell.kind === "text" ? (
									<div
										key={cell.alignment_version}
										className={`border-l-4 px-3 py-3 ${LEFT_BORDER[columns[columnIndex]?.color] ?? LEFT_BORDER.foreground}`}>
										<p className='mb-1 font-mono text-xs text-text/80'>{columns[columnIndex]?.title}</p>
										{cell.units.map(unit => (
											<p key={unit.id} className='mb-2 text-base leading-relaxed last:mb-0'>
												{unit.content}
											</p>
										))}
									</div>
								) : null,
							)}
						</section>
					))}
				</div>
			)}

			{matrix.total_rows === 0 ? (
				<p className='py-10 text-text'>Inga stycken att visa.</p>
			) : (
				<article className='lg:flex hidden gap-0'>
					<div className='min-w-0 flex-1 grid grid-cols-[28px_44px_minmax(0,1fr)] border border-border'>
						{/* Fast under toppmenyn (61 px) så att kolumnnamnen syns när man scrollar långa rader. */}
						<header className='sticky top-[61px] z-30 col-span-full grid grid-cols-subgrid items-center rounded-tl-xl border-b border-border bg-secondary text-bg'>
							<div className='rounded-tl-4xl font-display text-bg'></div>
							<div className='py-4 px-2 pl-4'>#</div>
							<div className='grid min-w-0 grid-flow-col auto-cols-fr'>
								{columns.map(column => (
									<div className='flex gap-2 text-bg font-sm' key={column.versionId}>
										<div className={`w-1.5 border-l border-surface ${BAR_CLASS[column.color]}`}></div>
										<span className='px-2 py-4 font-display font-sm'>{column.title}</span>
									</div>
								))}
							</div>
						</header>
						{matrix.rows.map((row, index) => (
							<div
								key={row.row}
								data-position={row.row}
								className='group/row col-span-full grid grid-cols-subgrid bg-surface duration-200 hover:bg-primary/5'>
								<div className='flex items-center justify-center'>
									{(() => {
										const unit = referenceUnit(row)
										if (!unit) return null
										const bookmarkId = bookmarks[unit.id]
										return (
											<button
												type='button'
												title={bookmarkId ? "Ta bort bokmärke" : "Lägg till bokmärke"}
												aria-label={bookmarkId ? "Ta bort bokmärke" : "Lägg till bokmärke"}
												aria-pressed={Boolean(bookmarkId)}
												disabled={bookmarkBusy === unit.id}
												onClick={() => toggleBookmark(row)}
												className={`rounded p-1 hover:bg-text/10 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${
													bookmarkId
														? "text-primary"
														: "text-text/30 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
												}`}>
												<BookmarkIcon size={14} fill={bookmarkId ? "currentColor" : "none"} />
											</button>
										)
									})()}
								</div>
								<div className='font-mono text-text-muted text-sm border-r border-b border-border h-full items-center flex'>
									{row.row + 1}
								</div>
								<div className='grid min-w-0 grid-flow-col auto-cols-fr'>
									{row.cells.map((cell, columnIndex) => (
										<Cell
											key={cell.alignment_version}
											cell={cell}
											above={matrix.rows[index - 1]?.cells[columnIndex] ?? null}
											below={matrix.rows[index + 1]?.cells[columnIndex] ?? null}
											row={row.row}
											column={columns[columnIndex]}
											busy={busy}
											onAction={handleAction}
											onChanged={reload}
										/>
									))}
								</div>
							</div>
						))}
					</div>
					<div className='w-65 shrink-0'>
						<div className='px-4 py-4 font-mono text-xs tracking-widest uppercase'>Marginalnotiser</div>
						<AnnotationColumn rows={annotationRows} onDelete={handleDeleteAnnotation} />
					</div>
				</article>
			)}
			{matrix.total_rows > 0 && pager}
		</>
	)
}
