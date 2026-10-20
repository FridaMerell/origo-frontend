import { BAR_CLASS } from "../_ui/editions"
import type { Column } from "./columns"

/** Utgåvans namn med dess färg, som i utgåvelistan ovanför läsvyn. */
export default function EditionLabel({ column }: { column: Column }) {
	return (
		<span className='inline-flex min-w-0 items-center gap-2 font-display text-sm italic text-text-muted'>
			<span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${BAR_CLASS[column.color] ?? BAR_CLASS.foreground}`} />
			<span className='truncate'>{column.title}</span>
		</span>
	)
}
