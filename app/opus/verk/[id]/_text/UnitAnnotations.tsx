import { PencilIcon, XIcon } from "lucide-react"
import type { ReadingAnnotation, ReadingUnit } from "@/app/lib/dal/opus"
import { explanationOf } from "../_word-panel/word-panel"

/** Styckets annotationer i en lista, för att kunna ta bort dem innan stycket redigeras eller delas. */
export default function UnitAnnotations({
	unit,
	busy,
	onEdit,
	onRemove,
}: {
	unit: ReadingUnit
	busy: boolean
	onEdit: (annotation: ReadingAnnotation, anchor: HTMLElement) => void
	onRemove: (ids: number[]) => void
}) {
	return (
		<div className='mt-2 rounded border border-border bg-surface p-2 text-xs'>
			<p className='mb-1 text-text-muted'>
				Annotationer i stycket. Ta bort dem för att kunna redigera eller dela stycket.
			</p>
			<ul className='flex flex-col gap-1'>
				{unit.annotations.map(annotation => (
					<li key={annotation.id} className='flex items-start justify-between gap-2'>
						<span className='min-w-0'>
							<span className='font-mono text-[10px] uppercase text-text-muted'>{annotation.kind} </span>
							{annotation.start_offset != null && annotation.end_offset != null
								? `»${unit.content.slice(annotation.start_offset, annotation.end_offset)}» `
								: "(hela stycket) "}
							<span className='text-text-muted'>{explanationOf(annotation).slice(0, 60)}</span>
						</span>
						{annotation.start_offset != null && (
							<button
								type='button'
								title='Redigera annotationen'
								aria-label='Redigera annotationen'
								disabled={busy}
								onClick={event => onEdit(annotation, event.currentTarget)}
								className='ml-auto shrink-0 text-text-muted hover:text-text disabled:opacity-30 cursor-pointer'>
								<PencilIcon size={12} />
							</button>
						)}
						<button
							type='button'
							title='Ta bort annotationen'
							aria-label='Ta bort annotationen'
							disabled={busy}
							onClick={() => onRemove([annotation.id])}
							className='shrink-0 text-text-muted hover:text-text disabled:opacity-30 cursor-pointer'>
							<XIcon size={12} />
						</button>
					</li>
				))}
			</ul>
			{unit.annotations.length > 1 && (
				<button
					type='button'
					disabled={busy}
					onClick={() => onRemove(unit.annotations.map(annotation => annotation.id))}
					className='mt-2 rounded border border-border px-2 py-1 hover:border-text/40 disabled:opacity-30 cursor-pointer'>
					Ta bort alla ({unit.annotations.length})
				</button>
			)}
		</div>
	)
}
