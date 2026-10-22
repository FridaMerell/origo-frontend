"use client"

import type { AlignmentCell, Id } from "@/app/lib/dal/opus"
import UnitText from "../_text/UnitText"
import Menu from "../_ui/Menu"
import { BORDER_CLASS } from "../_ui/editions"
import ChapterHeading from "./ChapterHeading"
import type { Column } from "./columns"

export type CellAction = "insert_gap" | "remove_gap" | "join" | "split" | "combine"
/** Bara för "combine": första stycket i cellen och hur många som ska slås ihop med det. */
export type CombineTarget = { unitId: Id; count: number }

/** En utgåvas cell i en rad av tabellen, med cellmenyn för att flytta och sammanfoga. */
export default function Cell({
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
					<CellMenu cell={cell} above={above} below={below} row={row} versionId={versionId} busy={busy} onAction={onAction} />
				</div>
			)}
			{empty ? (
				<span className='select-none font-mono text-xs text-text-faint'>{cell.kind === "gap" ? "—" : ""}</span>
			) : (
				<div className='flex flex-col gap-3'>
					{cell.units.map(unit => (
						<div key={unit.id}>
							<ChapterHeading unit={unit} />
							<UnitText unit={unit} label={unit.label || unit.position} language={column.language} onChanged={onChanged} />
						</div>
					))}
				</div>
			)}
		</div>
	)
}

/** Cellmenyn för att flytta och sammanfoga; används både i tabellen och i mobilkorten. */
export function CellMenu({
	cell,
	above,
	below,
	row,
	versionId,
	busy,
	onAction,
}: {
	cell: AlignmentCell
	above: AlignmentCell | null
	below: AlignmentCell | null
	row: number
	versionId: Id
	busy: boolean
	onAction: (action: CellAction, versionId: Id, row: number, target?: CombineTarget) => void
}) {
	return (
		<Menu
			ariaLabel='Flytta eller sammanfoga cellen'
			disabled={busy}
			triggerClassName='rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text opacity-0 transition-opacity hover:border-text/40 pointer-coarse:opacity-100 focus-visible:opacity-100 group-hover/cell:opacity-100 group-focus-within/cell:opacity-100 aria-expanded:opacity-100 cursor-pointer'
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
	)
}
