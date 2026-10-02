"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import type { GlossaryDetail, LexicalEntry, LexicalEntryCreate } from "@/app/lib/dal/opus"
import { useUser } from "@/app/lib/user-context"
import {
	addGlossaryEntry,
	deleteGlossary,
	getGlossary,
	removeGlossaryEntry,
	updateGlossary,
} from "../../_actions/glossary-actions"
import { createLexicalEntry, updateLexicalEntry } from "../../_actions/lexical-entry-actions"
import { TextAreaField, TextField } from "../../forms/Fields/Fields"
import Divider from "../../ui/Divider"
import GlossaryForm from "../GlossaryForm"

/** Synlig fokusmarkering för tangentbordsnavigering, samma som Opus formulärfält. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

const LINK_BUTTON = `rounded-sm text-text-muted underline underline-offset-4 hover:text-text disabled:opacity-40 cursor-pointer ${FOCUS}`

function modernFormOf(entry: LexicalEntry) {
	const value = entry.inflection_data?.modern_form
	return typeof value === "string" ? value : ""
}

function synonymsOf(entry: LexicalEntry) {
	const value = entry.inflection_data?.synonyms
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function matches(entry: LexicalEntry, query: string) {
	const haystack = [entry.lemma, entry.definition, entry.part_of_speech, modernFormOf(entry), ...synonymsOf(entry)]
		.join(" ")
		.toLocaleLowerCase("sv")
	return haystack.includes(query.toLocaleLowerCase("sv"))
}

/** Ett ords uppgifter; används både för att lägga till ett nytt ord och för att redigera ett. */
function EntryForm({
	entry,
	submitLabel,
	onSubmit,
	onCancel,
}: {
	entry?: LexicalEntry
	submitLabel: string
	onSubmit: (data: LexicalEntryCreate) => Promise<void>
	onCancel: () => void
}) {
	const [lemma, setLemma] = useState(entry?.lemma ?? "")
	const [language, setLanguage] = useState(entry?.language ?? "sv")
	const [modernForm, setModernForm] = useState(entry ? modernFormOf(entry) : "")
	const [partOfSpeech, setPartOfSpeech] = useState(entry?.part_of_speech ?? "")
	const [synonyms, setSynonyms] = useState(entry ? synonymsOf(entry).join(", ") : "")
	const [definition, setDefinition] = useState(entry?.definition ?? "")
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!lemma.trim()) return
		setPending(true)
		setError(null)
		try {
			await onSubmit({
				lemma: lemma.trim(),
				language: language.trim() || "sv",
				part_of_speech: partOfSpeech.trim(),
				definition: definition.trim(),
				inflection_data: {
					// Övriga uppgifter i inflection_data (från andra verktyg) behålls.
					...(entry?.inflection_data ?? {}),
					modern_form: modernForm.trim() || undefined,
					synonyms: synonyms.trim() ? synonyms.split(",").map(s => s.trim()).filter(Boolean) : undefined,
				},
			})
		} catch {
			setError(entry ? "Ordet kunde inte sparas. Det kan tillhöra någon annan." : "Ordet kunde inte sparas.")
		} finally {
			setPending(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className='flex flex-col gap-3'>
			<div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]'>
				<TextField
					label='Ord'
					value={lemma}
					onChange={event => setLemma(event.target.value)}
					maxLength={255}
					autoFocus
					required
				/>
				<TextField label='Språk' value={language} onChange={event => setLanguage(event.target.value)} maxLength={16} />
			</div>
			<div className='grid gap-3 sm:grid-cols-2'>
				<TextField
					label='Modernt'
					value={modernForm}
					onChange={event => setModernForm(event.target.value)}
					placeholder='Nutida form'
				/>
				<TextField
					label='Ordklass'
					value={partOfSpeech}
					onChange={event => setPartOfSpeech(event.target.value)}
					maxLength={100}
					placeholder='verb, substantiv…'
				/>
			</div>
			<TextField
				label='Synonymer'
				value={synonyms}
				onChange={event => setSynonyms(event.target.value)}
				placeholder='Kommaseparerade'
			/>
			<TextAreaField label='Definition' value={definition} onChange={event => setDefinition(event.target.value)} rows={3} />
			{error && (
				<p role='alert' className='text-sm text-danger'>
					{error}
				</p>
			)}
			<div className='flex justify-end gap-3'>
				<Button type='button' variant='ghost' onClick={onCancel}>
					Avbryt
				</Button>
				<Button type='submit' disabled={pending || !lemma.trim()}>
					{pending ? "Sparar…" : submitLabel}
				</Button>
			</div>
		</form>
	)
}

function EntryItem({
	entry,
	canEdit,
	canRemove,
	onSave,
	onRemove,
}: {
	entry: LexicalEntry
	canEdit: boolean
	canRemove: boolean
	onSave: (data: LexicalEntryCreate) => Promise<void>
	onRemove: () => Promise<void>
}) {
	const [editing, setEditing] = useState(false)
	const [removing, setRemoving] = useState(false)
	const modernForm = modernFormOf(entry)
	const synonyms = synonymsOf(entry)
	const facts = [modernForm && `Modernt: ${modernForm}`, entry.part_of_speech, entry.language].filter(Boolean)

	if (editing) {
		return (
			<li className='rounded-lg border border-border bg-surface p-5'>
				<EntryForm
					entry={entry}
					submitLabel='Spara'
					onCancel={() => setEditing(false)}
					onSubmit={async data => {
						await onSave(data)
						setEditing(false)
					}}
				/>
			</li>
		)
	}

	return (
		<li className='flex flex-col gap-1 border-b border-border py-4 sm:flex-row sm:items-baseline sm:gap-6'>
			<div className='min-w-0 sm:w-56 sm:shrink-0'>
				<p className='font-display text-xl font-semibold text-text'>{entry.lemma}</p>
				{facts.length > 0 && <p className='text-sm text-text-muted'>{facts.join(" · ")}</p>}
			</div>
			<div className='min-w-0 flex-1'>
				{entry.definition ? (
					<p className='font-display text-lg leading-relaxed text-text'>{entry.definition}</p>
				) : (
					<p className='font-display text-lg italic text-text-muted'>Ingen definition</p>
				)}
				{synonyms.length > 0 && <p className='mt-1 text-sm text-text-muted'>Synonymer: {synonyms.join(", ")}</p>}
			</div>
			{(canEdit || canRemove) && (
				<div className='flex shrink-0 gap-4 text-sm'>
					{canEdit && (
						<button type='button' onClick={() => setEditing(true)} className={LINK_BUTTON}>
							Redigera
						</button>
					)}
					{canRemove && (
						<button
							type='button'
							disabled={removing}
							onClick={async () => {
								setRemoving(true)
								try {
									await onRemove()
								} finally {
									setRemoving(false)
								}
							}}
							className={LINK_BUTTON}>
							{removing ? "Tar bort…" : "Ta bort ur listan"}
						</button>
					)}
				</div>
			)}
		</li>
	)
}

/** En ordlista med alla ord. Ägaren kan redigera listan och lägga till, ändra och ta bort ord. */
export default function GlossaryView({ glossary: initial }: { glossary: GlossaryDetail }) {
	const user = useUser()
	const router = useRouter()
	const [glossary, setGlossary] = useState(initial)
	const [editingDetails, setEditingDetails] = useState(false)
	const [adding, setAdding] = useState(false)
	const [query, setQuery] = useState("")
	const [error, setError] = useState<string | null>(null)
	const isOwner = glossary.owner === user?.id

	const shown = useMemo(
		() => (query.trim() ? glossary.entries.filter(entry => matches(entry, query.trim())) : glossary.entries),
		[glossary.entries, query],
	)

	async function refresh() {
		setGlossary(await getGlossary(glossary.id))
	}

	async function handleDelete() {
		if (!window.confirm("Ta bort ordlistan? Orden finns kvar i texterna. Det går inte att ångra.")) return
		setError(null)
		try {
			await deleteGlossary(glossary.id)
			router.push("/ordlistor")
		} catch {
			setError("Ordlistan kunde inte tas bort.")
		}
	}

	async function handleRemoveEntry(entryId: number) {
		setError(null)
		try {
			await removeGlossaryEntry(glossary.id, entryId)
			await refresh()
		} catch {
			setError("Ordet kunde inte tas bort ur listan.")
		}
	}

	return (
		<>
			<p className='mb-4'>
				<Link href='/ordlistor' className={`font-display italic text-text-muted underline underline-offset-4 hover:text-text ${FOCUS}`}>
					← Alla ordlistor
				</Link>
			</p>
			{editingDetails ? (
				<section className='max-w-xl rounded-lg border border-border bg-surface p-5'>
					<GlossaryForm
						initial={glossary}
						submitLabel='Spara'
						onCancel={() => setEditingDetails(false)}
						onSubmit={async data => {
							setGlossary(await updateGlossary(glossary.id, data))
							setEditingDetails(false)
						}}
					/>
				</section>
			) : (
				<section className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
					<div className='max-w-2xl'>
						<h1 className='font-display text-3xl font-bold text-text first-letter:text-primary'>{glossary.title}</h1>
						{glossary.description && (
							<p className='mt-2 whitespace-pre-line font-display text-lg italic text-text-muted'>{glossary.description}</p>
						)}
						{isOwner && (
							<div className='mt-3 flex gap-5 text-sm'>
								<button type='button' onClick={() => setEditingDetails(true)} className={LINK_BUTTON}>
									Redigera ordlistan
								</button>
								<button type='button' onClick={handleDelete} className={`${LINK_BUTTON} hover:text-danger`}>
									Ta bort ordlistan
								</button>
							</div>
						)}
					</div>
					{glossary.entries.length > 0 && (
						<div className='w-full sm:w-72'>
							<TextField
								label='Sök i ordlistan'
								hideLabel
								type='search'
								value={query}
								onChange={event => setQuery(event.target.value)}
								placeholder='Sök på ord, definition eller synonym'
							/>
						</div>
					)}
				</section>
			)}

			<Divider>
				<span className='font-display italic oldstyle-nums'>
					{query.trim() ? `${shown.length} av ${glossary.entries.length} ord` : `${glossary.entries.length} ord`} ·{" "}
					{glossary.is_private ? "Privat" : "Offentlig"}
				</span>
			</Divider>

			{error && (
				<p role='alert' className='my-3 text-sm text-danger'>
					{error}
				</p>
			)}

			{glossary.entries.length === 0 && !adding && (
				<p className='my-10 text-center font-display text-lg text-text-muted'>
					{isOwner
						? "Inga ord än. Lägg till ett här, eller markera ett ord i en text och skapa en definition."
						: "Inga ord än."}
				</p>
			)}

			{shown.length > 0 && (
				<ul className='my-4 flex flex-col'>
					{shown.map(entry => (
						<EntryItem
							key={entry.id}
							entry={entry}
							canEdit={entry.owner === user?.id}
							canRemove={isOwner}
							onSave={async data => {
								await updateLexicalEntry(entry.id, data)
								await refresh()
							}}
							onRemove={() => handleRemoveEntry(entry.id)}
						/>
					))}
				</ul>
			)}
			{query.trim() && shown.length === 0 && glossary.entries.length > 0 && (
				<p className='my-10 text-center font-display text-lg italic text-text-muted'>Inga ord matchar sökningen.</p>
			)}

			{isOwner &&
				(adding ? (
					<section className='my-6 max-w-2xl rounded-lg border border-border bg-surface p-5'>
						<EntryForm
							submitLabel='Lägg till'
							onCancel={() => setAdding(false)}
							onSubmit={async data => {
								const entry = await createLexicalEntry(data)
								await addGlossaryEntry(glossary.id, entry.id)
								await refresh()
								setAdding(false)
							}}
						/>
					</section>
				) : (
					<div className='my-6'>
						<Button type='button' variant='secondary' onClick={() => setAdding(true)}>
							Lägg till ord
						</Button>
					</div>
				))}
		</>
	)
}
