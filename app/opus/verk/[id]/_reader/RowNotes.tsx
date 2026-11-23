"use client"

import { useState } from "react"
import type { Id, ReadingUnit } from "@/app/lib/dal/opus"
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog"
import { Button } from "@/app/components/ui/Button"
import { TextAreaField } from "../../../forms/Fields/Fields"
import type { Column } from "./columns"
import EditionLabel from "./EditionLabel"

export type RowNote = { annotation: ReadingUnit["annotations"][number]; unit: ReadingUnit; column: Column }

/** Mobil: radens noter och hänvisningar under texten (tabellen har dem i marginalen). */
export default function RowNotes({
	notes,
	onDelete,
	onEdit,
}: {
	notes: RowNote[]
	onDelete: (annotationId: Id) => void
	onEdit: (annotationId: Id, body: string) => Promise<void>
}) {
	const [editing, setEditing] = useState<Id | null>(null)
	const [draft, setDraft] = useState("")
	const [saving, setSaving] = useState(false)
	// Långa noter visas avkortade tills man öppnar dem.
	const [expanded, setExpanded] = useState<Id[]>([])
	const { requestConfirm, dialog } = useConfirmDialog()
	const link = "rounded-sm text-text-muted underline underline-offset-4 hover:text-text disabled:opacity-40 cursor-pointer"

	async function save(annotationId: Id) {
		if (!draft.trim()) return
		setSaving(true)
		try {
			await onEdit(annotationId, draft.trim())
			setEditing(null)
		} finally {
			setSaving(false)
		}
	}

	return (
		<>
		{dialog}
		<ul className='flex flex-col gap-4'>
			{notes.map(({ annotation, unit, column }) => {
				const target =
					annotation.start_offset != null && annotation.end_offset != null
						? unit.content.slice(annotation.start_offset, annotation.end_offset)
						: null
				return (
					<li key={annotation.id} className='flex flex-col gap-1'>
						<div className='flex items-baseline justify-between gap-3'>
							<EditionLabel column={column} />
							<span className='shrink-0 font-body text-xs uppercase tracking-widest text-text-muted'>
								{annotation.kind === "reference" ? "Hänvisning" : "Anteckning"}
							</span>
						</div>
						{target && <p className='font-display italic text-text-muted'>»{target}»</p>}
						{editing === annotation.id ? (
							<div className='mt-1 flex flex-col gap-2'>
								<TextAreaField
									label='Anteckning'
									value={draft}
									onChange={event => setDraft(event.target.value)}
									rows={3}
									autoFocus
								/>
								<div className='flex items-center justify-end gap-4 text-sm'>
									<button type='button' onClick={() => setEditing(null)} className={link}>
										Avbryt
									</button>
									<Button
										type='button'
										size='sm'
										rounded='rounded-md'
										disabled={saving || !draft.trim()}
										onClick={() => save(annotation.id)}>
										{saving ? "Sparar…" : "Spara"}
									</Button>
								</div>
							</div>
						) : (
							<>
								<p
									className={`whitespace-pre-line font-display text-sm leading-relaxed text-text ${
										expanded.includes(annotation.id) ? "" : "line-clamp-4"
									}`}>
									{annotation.body}
								</p>
								<div className='flex gap-5 text-sm'>
									{annotation.body.length > 200 && (
										<button
											type='button'
											aria-expanded={expanded.includes(annotation.id)}
											onClick={() =>
												setExpanded(current =>
													current.includes(annotation.id)
														? current.filter(id => id !== annotation.id)
														: [...current, annotation.id],
												)
											}
											className={link}>
											{expanded.includes(annotation.id) ? "Visa mindre" : "Visa hela"}
										</button>
									)}
									<button
										type='button'
										onClick={() => {
											setDraft(annotation.body)
											setEditing(annotation.id)
										}}
										className={link}>
										Redigera
									</button>
									<button
										type='button'
										onClick={() => {
											requestConfirm({
												title: "Ta bort noten?",
												message: "Det går inte att ångra.",
												confirmLabel: "Ta bort",
												destructive: true,
												onConfirm: () => onDelete(annotation.id),
											})
										}}
										className={`${link} hover:text-danger`}>
										Ta bort
									</button>
								</div>
							</>
						)}
					</li>
				)
			})}
		</ul>
		</>
	)
}
