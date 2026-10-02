"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/app/components/ui/Button"
import type { GlossaryCreate, GlossaryDetail } from "@/app/lib/dal/opus"
import { CheckboxField, TextAreaField, TitleField } from "../forms/Fields/Fields"

/** Namn, beskrivning och synlighet för en ordlista; används både för att skapa och redigera. */
export default function GlossaryForm({
	initial,
	submitLabel,
	onSubmit,
	onCancel,
}: {
	initial?: Pick<GlossaryDetail, "title" | "description" | "is_private">
	submitLabel: string
	onSubmit: (data: GlossaryCreate) => Promise<void>
	onCancel: () => void
}) {
	const [title, setTitle] = useState(initial?.title ?? "")
	const [description, setDescription] = useState(initial?.description ?? "")
	const [isPrivate, setIsPrivate] = useState(initial?.is_private ?? false)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!title.trim()) return
		setPending(true)
		setError(null)
		try {
			await onSubmit({ title: title.trim(), description: description.trim(), is_private: isPrivate })
		} catch {
			setError("Ordlistan kunde inte sparas.")
		} finally {
			setPending(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
			<TitleField
				label='Namn'
				value={title}
				onChange={event => setTitle(event.target.value)}
				maxLength={255}
				placeholder='Till exempel: Fornsvenska ord'
				autoFocus
				required
			/>
			<TextAreaField
				label='Beskrivning'
				value={description}
				onChange={event => setDescription(event.target.value)}
				rows={2}
			/>
			<CheckboxField
				label='Privat ordlista'
				helpText='En privat ordlista syns bara för dig. Annars kan alla läsa den.'
				checked={isPrivate}
				onChange={event => setIsPrivate(event.target.checked)}
			/>
			{error && (
				<p role='alert' className='text-sm text-danger'>
					{error}
				</p>
			)}
			<div className='flex justify-end gap-3'>
				<Button type='button' variant='ghost' onClick={onCancel}>
					Avbryt
				</Button>
				<Button type='submit' disabled={pending || !title.trim()}>
					{pending ? "Sparar…" : submitLabel}
				</Button>
			</div>
		</form>
	)
}
