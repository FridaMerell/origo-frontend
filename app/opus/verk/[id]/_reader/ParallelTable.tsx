"use client"

import type { AlignmentRow, Id } from "@/app/lib/dal/opus"
import { BAR_CLASS } from "../_ui/editions"
import AnnotationColumn from "./AnnotationColumn"
import Cell, { type CellAction, type CombineTarget } from "./Cell"
import { chapterAt, type Column } from "./columns"
import type { RenderBookmark } from "./useRowBookmarks"

/** Stora skärmar: utgåvorna sida vid sida i en tabell, med noterna i marginalen. */
export default function ParallelTable({
	rows,
	columns,
	topRow,
	busy,
	renderBookmark,
	onAction,
	onChanged,
	onDeleteNote,
	onEditNote,
}: {
	rows: AlignmentRow[]
	columns: Column[]
	/** Raden överst i läsbandet; rubriken visar vilket kapitel varje utgåva är i där. */
	topRow: number | null
	busy: boolean
	renderBookmark: RenderBookmark
	onAction: (action: CellAction, versionId: Id, row: number, target?: CombineTarget) => void
	onChanged: () => void
	onDeleteNote: (annotationId: Id) => void
	onEditNote: (annotationId: Id, body: string) => Promise<void>
}) {
	const editionTitle = (versionId: Id) => columns.find(column => column.versionId === versionId)?.title ?? ""

	const annotationRows = rows.flatMap((row: AlignmentRow) => {
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
		<article data-reader-start className='lg:flex hidden gap-0'>
			<div className='min-w-0 flex-1 grid grid-cols-[28px_44px_minmax(0,1fr)] border border-border'>
				{/* Fast under toppmenyn (61 px) så att kolumnnamnen syns när man scrollar långa rader. */}
				<header
					data-reader-header
					className='sticky top-[61px] z-30 col-span-full grid grid-cols-subgrid items-center rounded-tl-xl border-b border-border bg-secondary text-bg'>
					<div className='rounded-tl-4xl font-display text-bg'></div>
					<div className='py-4 px-2 pl-4'>#</div>
					<div className='grid min-w-0 grid-flow-col auto-cols-fr'>
						{columns.map((column, columnIndex) => {
							const chapter = chapterAt(rows, topRow, columnIndex)
							return (
								<div className='flex min-w-0 gap-2 text-bg font-sm' key={column.versionId}>
									<div className={`w-1.5 border-l border-surface ${BAR_CLASS[column.color]}`}></div>
									{/* Utgåvan och kapitlet man läser i just nu. */}
									<div className='flex min-w-0 flex-col justify-center px-2 py-2.5'>
										<span className='truncate font-display font-sm'>{column.title}</span>
										<span className='truncate font-display text-xs italic text-bg/70'>{chapter ?? " "}</span>
									</div>
								</div>
							)
						})}
					</div>
				</header>
				{rows.map((row, index) => (
					<div
						key={row.row}
						data-position={row.row}
						className='group/row col-span-full grid grid-cols-subgrid bg-surface duration-200 hover:bg-primary/5'>
						<div className='flex items-center justify-center'>{renderBookmark(row, false)}</div>
						<div className='font-mono text-text-muted text-sm border-r border-b border-border h-full items-center flex'>
							{row.row + 1}
						</div>
						<div className='grid min-w-0 grid-flow-col auto-cols-fr'>
							{row.cells.map((cell, columnIndex) => (
								<Cell
									key={cell.alignment_version}
									cell={cell}
									above={rows[index - 1]?.cells[columnIndex] ?? null}
									below={rows[index + 1]?.cells[columnIndex] ?? null}
									row={row.row}
									column={columns[columnIndex]}
									busy={busy}
									onAction={onAction}
									onChanged={onChanged}
								/>
							))}
						</div>
					</div>
				))}
			</div>
			<div className='w-65 shrink-0'>
				<div className='px-4 py-4 font-mono text-xs tracking-widest uppercase'>Marginalnotiser</div>
				<AnnotationColumn rows={annotationRows} onDelete={onDeleteNote} onEdit={onEditNote} />
			</div>
		</article>
	)
}
