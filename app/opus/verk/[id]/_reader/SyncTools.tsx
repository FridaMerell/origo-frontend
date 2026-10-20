"use client"

import { useState } from "react"
import { WandSparklesIcon } from "lucide-react"
import type { AlignmentMatrix, Id } from "@/app/lib/dal/opus"
import ChapterSync, { type EditionInfo } from "./ChapterSync"
import type { Column } from "./columns"

/** Raden ovanför läsvyn: status och fel, och verktygen för att synka utgåvornas kapitel. */
export default function SyncTools({
	error,
	notice,
	busy,
	disabled,
	setId,
	columns,
	editions,
	limit,
	onSyncChapters,
	onApplied,
	onReset,
}: {
	error: string | null
	notice: string | null
	busy: boolean
	/** Kapitelsynken går inte att använda (upptagen, inga rader eller bara en utgåva). */
	disabled: boolean
	setId: Id
	columns: Column[]
	editions: EditionInfo[]
	limit: number
	onSyncChapters: () => void
	onApplied: (matrix: AlignmentMatrix) => void
	onReset: () => void
}) {
	// Mobil: synkverktygen ligger hopfällda så att texten börjar högre upp.
	const [toolsOpen, setToolsOpen] = useState(false)

	return (
		<div className='flex flex-wrap items-center justify-end gap-3 pb-3'>
			{error && <span className='mr-auto text-sm text-primary'>{error}</span>}
			{!error && notice && <span className='mr-auto text-sm text-text'>{notice}</span>}
			{busy && <span className='font-mono text-xs text-text'>Sparar…</span>}
			<button
				type='button'
				aria-expanded={toolsOpen}
				onClick={() => setToolsOpen(open => !open)}
				className='rounded border border-border px-3 py-1.5 text-sm text-text hover:border-text/40 cursor-pointer lg:hidden'>
				Synkning {toolsOpen ? "▴" : "▾"}
			</button>
			<div className={`${toolsOpen ? "flex" : "hidden"} w-full flex-wrap items-center justify-end gap-3 lg:flex lg:w-auto`}>
				<button
					type='button'
					disabled={disabled}
					onClick={onSyncChapters}
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
					disabled={disabled}
					onApplied={onApplied}
				/>
				<button
					type='button'
					disabled={busy}
					onClick={onReset}
					className='rounded border border-border px-3 py-1.5 text-sm text-text hover:border-text/40 disabled:opacity-40 cursor-pointer'>
					Börja om
				</button>
			</div>
		</div>
	)
}
