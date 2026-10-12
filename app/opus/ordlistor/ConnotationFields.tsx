"use client"

import { TextField } from "../forms/Fields/Fields"

/** Ordets konnotationer som kommaseparerade taggar, och en fri anmärkning om dem. */
export default function ConnotationFields({
	tags,
	note,
	onTagsChange,
	onNoteChange,
}: {
	tags: string
	note: string
	onTagsChange: (tags: string) => void
	onNoteChange: (note: string) => void
}) {
	return (
		<>
			<TextField
				label='Konnotationer'
				value={tags}
				onChange={event => onTagsChange(event.target.value)}
				placeholder='ålderdomlig, högtidlig, nedsättande…'
			/>
			<TextField
				label='Om konnotationen'
				value={note}
				onChange={event => onNoteChange(event.target.value)}
				placeholder='I vilka sammanhang ordet laddas'
			/>
		</>
	)
}
