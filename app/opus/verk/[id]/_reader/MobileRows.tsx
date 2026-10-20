"use client"

import type { AlignmentRow, Id } from "@/app/lib/dal/opus"
import UnitText from "../_text/UnitText"
import ChapterHeading from "./ChapterHeading"
import type { Column } from "./columns"
import EditionLabel from "./EditionLabel"
import RowNotes, { type RowNote } from "./RowNotes"
import type { RenderBookmark } from "./useRowBookmarks"

/**
 * Mobil: tabellen får inte plats, så varje rad blir ett kort med utgåvorna under varandra.
 * Texten går att annotera som i tabellen; radens noter står under texten.
 */
export default function MobileRows({
	rows,
	columns,
	renderBookmark,
	onChanged,
	onDeleteNote,
	onEditNote,
}: {
	rows: AlignmentRow[]
	columns: Column[]
	renderBookmark: RenderBookmark
	onChanged: () => void
	onDeleteNote: (annotationId: Id) => void
	onEditNote: (annotationId: Id, body: string) => Promise<void>
}) {
	return (
		<div data-reader-start className='lg:hidden flex flex-col gap-5'>
			{rows.map(row => {
				const cells = row.cells
					.map((cell, columnIndex) => ({ cell, column: columns[columnIndex] }))
					.filter(({ cell, column }) => column && cell.kind === "text")
				const notes: RowNote[] = cells.flatMap(({ cell, column }) =>
					cell.units.flatMap(unit =>
						unit.annotations
							.filter(annotation => annotation.kind !== "definition")
							.map(annotation => ({ annotation, unit, column })),
					),
				)
				return (
					<section
						key={row.row}
						data-position={row.row}
						className='overflow-hidden rounded-xl border border-border bg-surface shadow-md'>
						<div className='flex items-center justify-between gap-3 border-b border-border px-5 py-1.5'>
							<span className='font-display text-sm italic text-text-muted oldstyle-nums'>Rad {row.row + 1}</span>
							<div className='-mr-1'>{renderBookmark(row, true)}</div>
						</div>
						{cells.map(({ cell, column }) => (
							<div
								key={cell.alignment_version}
								className='flex flex-col gap-4 border-b border-dashed border-border px-5 py-4 last:border-b-0'>
								{cell.units.map((unit, unitIndex) => (
									<div key={unit.id}>
										<ChapterHeading unit={unit} />
										<UnitText
											unit={unit}
											label={unit.label || unit.position}
											language={column.language}
											heading={unitIndex === 0 ? <EditionLabel column={column} /> : null}
											onChanged={onChanged}
										/>
									</div>
								))}
							</div>
						))}
						{notes.length > 0 && (
							<div className='border-t border-border bg-bg/60 px-5 py-4'>
								<RowNotes notes={notes} onDelete={onDeleteNote} onEdit={onEditNote} />
							</div>
						)}
					</section>
				)
			})}
		</div>
	)
}
