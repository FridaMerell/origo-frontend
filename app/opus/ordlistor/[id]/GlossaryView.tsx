"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, LinkButton } from "@/app/components/ui/Button"
import type {
	GlossaryDetail,
	LexicalEntry,
	LexicalEntryCreate,
	LexicalEntryPage,
	LexicalForm,
	LexicalFormCreate,
	LexicalFormKind,
} from "@/app/lib/dal/opus"
import { useUser } from "@/app/lib/user-context"
import { addGlossaryEntry, deleteGlossary, removeGlossaryEntry, updateGlossary } from "../../_actions/glossary-actions"
import {
	createLexicalEntry,
	getLexicalEntry,
	listGlossaryEntries,
	setQuizMark,
	updateLexicalEntry,
} from "../../_actions/lexical-entry-actions"
import { createLexicalForm, deleteLexicalForm, updateLexicalForm } from "../../_actions/lexical-form-actions"
import { CheckboxField, ComboboxField, SelectField, TextAreaField, TextField } from "../../forms/Fields/Fields"
import Divider from "../../ui/Divider"
import ConnotationFields from "../ConnotationFields"
import GlossaryForm from "../GlossaryForm"
import GrammarFields from "../GrammarFields"
import {
	GLOSSARY_PAGE_SIZE,
	PART_OF_SPEECH_SUGGESTIONS,
	describeForm,
	emptyGrammar,
	FORM_KIND_LABELS,
	grammarOf,
	parseSynonyms,
	parseTags,
	synonymsOf,
	synonymText,
} from "../lexical-forms"

/** Synlig fokusmarkering för tangentbordsnavigering, samma som Opus formulärfält. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

const LINK_BUTTON = `rounded-sm text-text-muted underline underline-offset-4 hover:text-text disabled:opacity-40 cursor-pointer ${FOCUS}`

/** Samma bläddring som i anteckningslistan. */
const PAGER_BUTTON = `rounded-sm font-display italic whitespace-nowrap hover:text-text cursor-pointer ${FOCUS}`

function modernFormOf(entry: LexicalEntry) {
	const value = entry.inflection_data?.modern_form
	return typeof value === "string" ? value : ""
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
	const [gender, setGender] = useState(entry?.gender ?? "")
	const [synonyms, setSynonyms] = useState(synonymText(entry))
	const [connotations, setConnotations] = useState((entry?.connotations ?? []).join(", "))
	const [connotationNote, setConnotationNote] = useState(entry?.connotation_note ?? "")
	const [translation, setTranslation] = useState(entry?.translation ?? "")
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
				gender: gender.trim(),
				translation: translation.trim(),
				definition: definition.trim(),
				synonyms: parseSynonyms(synonyms, synonymsOf(entry)),
				connotations: parseTags(connotations),
				connotation_note: connotationNote.trim(),
				inflection_data: {
					// Övriga uppgifter i inflection_data (från andra verktyg) behålls.
					...(entry?.inflection_data ?? {}),
					modern_form: modernForm.trim() || undefined,
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
			<TextField
				label='Översättning'
				value={translation}
				onChange={event => setTranslation(event.target.value)}
				maxLength={255}
				placeholder='Kort glosa, visas i glosförhör'
			/>
			<div className='grid gap-3 sm:grid-cols-3'>
				<TextField
					label='Modernt'
					value={modernForm}
					onChange={event => setModernForm(event.target.value)}
					placeholder='Nutida form'
				/>
				<ComboboxField
					label='Ordklass'
					options={PART_OF_SPEECH_SUGGESTIONS}
					value={partOfSpeech}
					onValueChange={setPartOfSpeech}
					maxLength={100}
					placeholder='verb, substantiv…'
				/>
				<TextField
					label='Genus'
					value={gender}
					onChange={event => setGender(event.target.value)}
					maxLength={50}
					placeholder='maskulinum, femininum…'
				/>
			</div>
			<TextField
				label='Synonymer'
				value={synonyms}
				onChange={event => setSynonyms(event.target.value)}
				placeholder='Kommaseparerade'
			/>
			<ConnotationFields
				tags={connotations}
				note={connotationNote}
				onTagsChange={setConnotations}
				onNoteChange={setConnotationNote}
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

/** En stavningsvariant eller böjd form av ordet; för att lägga till en ny eller redigera en. */
function LexicalFormForm({
	form,
	entryId,
	onSaved,
	onCancel,
}: {
	form?: LexicalForm
	entryId: number
	onSaved: () => Promise<void>
	onCancel: () => void
}) {
	const [text, setText] = useState(form?.form ?? "")
	const [kind, setKind] = useState<LexicalFormKind>(form?.kind ?? "spelling")
	const [inflection, setInflection] = useState(form?.inflection ?? "")
	const [grammar, setGrammar] = useState(grammarOf(form))
	const [uncertain, setUncertain] = useState(form?.is_uncertain ?? false)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!text.trim()) return
		setPending(true)
		setError(null)
		const data: LexicalFormCreate = {
			entry: entryId,
			form: text.trim(),
			kind,
			inflection: inflection.trim(),
			...(kind === "inflection" ? grammar : emptyGrammar()),
			is_uncertain: uncertain,
		}
		try {
			if (form) await updateLexicalForm(form.id, data)
			else await createLexicalForm(data)
			await onSaved()
		} catch {
			setError("Formen kunde inte sparas.")
		} finally {
			setPending(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className='my-2 flex flex-col gap-3'>
			<div className='grid gap-3 sm:grid-cols-2'>
				<TextField
					label='Form'
					value={text}
					onChange={event => setText(event.target.value)}
					maxLength={255}
					placeholder='Som den står i texten'
					autoFocus
					required
				/>
				<SelectField label='Typ' value={kind} onChange={event => setKind(event.target.value as LexicalFormKind)}>
					{(Object.keys(FORM_KIND_LABELS) as LexicalFormKind[]).map(value => (
						<option key={value} value={value}>
							{FORM_KIND_LABELS[value]}
						</option>
					))}
				</SelectField>
			</div>
			{kind === "inflection" && <GrammarFields value={grammar} onChange={setGrammar} className='grid grid-cols-2 gap-3 sm:grid-cols-4' />}
			{/* En anmärkning passar båda typerna: en böjning i klartext, eller när en stavning var i bruk. */}
			<TextField
				label='Anmärkning'
				value={inflection}
				onChange={event => setInflection(event.target.value)}
				maxLength={255}
				placeholder={kind === "inflection" ? "Fri text, t.ex. pres. ind. 3 sg." : "Fri text, t.ex. före 1700"}
			/>
			<CheckboxField
				label='Osäker koppling'
				helpText='Jag är inte helt säker på att formen hör till det här ordet.'
				checked={uncertain}
				onChange={event => setUncertain(event.target.checked)}
			/>
			{error && (
				<p role='alert' className='text-sm text-danger'>
					{error}
				</p>
			)}
			<div className='flex justify-end gap-3'>
				<Button type='button' variant='ghost' size='sm' onClick={onCancel}>
					Avbryt
				</Button>
				<Button type='submit' size='sm' disabled={pending || !text.trim()}>
					{pending ? "Sparar…" : form ? "Spara" : "Lägg till"}
				</Button>
			</div>
		</form>
	)
}

/** Ordets stavningsvarianter och böjda former. Den som får redigera ordet kan ändra dem. */
function LexicalForms({
	entry,
	canEdit,
	onChanged,
}: {
	entry: LexicalEntry
	canEdit: boolean
	onChanged: () => Promise<void>
}) {
	const forms = entry.forms ?? []
	// Id för formen som redigeras, "new" för en ny, eller null.
	const [editing, setEditing] = useState<number | "new" | null>(null)
	const [error, setError] = useState<string | null>(null)

	async function handleDelete(form: LexicalForm) {
		setError(null)
		try {
			await deleteLexicalForm(form.id)
			await onChanged()
		} catch {
			setError("Formen kunde inte tas bort.")
		}
	}

	if (forms.length === 0 && !canEdit) return null

	return (
		<div className='mt-3 flex flex-col gap-2'>
			{forms.length > 0 && (
				<ul className='flex flex-col gap-1 text-sm'>
					{forms.map(form =>
						editing === form.id ? (
							<li key={form.id}>
								<LexicalFormForm
									form={form}
									entryId={entry.id}
									onCancel={() => setEditing(null)}
									onSaved={async () => {
										await onChanged()
										setEditing(null)
									}}
								/>
							</li>
						) : (
							<li key={form.id} className='flex flex-wrap items-baseline gap-x-3'>
								<span className='font-display text-base italic text-text'>{form.form}</span>
								<span className='text-text-muted'>{describeForm(form)}</span>
								{form.source && form.unit && (
									<Link
										href={`/verk/${form.source.work.id}?enhet=${form.unit}`}
										title='Visa i texten'
										className={LINK_BUTTON}>
										{[form.source.work.title, form.source.edition_title, form.source.chapter?.label]
											.filter(Boolean)
											.join(", ")}
									</Link>
								)}
								{canEdit && (
									<span className='flex gap-3'>
										<button type='button' onClick={() => setEditing(form.id)} className={LINK_BUTTON}>
											Ändra
										</button>
										<button type='button' onClick={() => handleDelete(form)} className={`${LINK_BUTTON} hover:text-danger`}>
											Ta bort
										</button>
									</span>
								)}
							</li>
						),
					)}
				</ul>
			)}
			{error && (
				<p role='alert' className='text-sm text-danger'>
					{error}
				</p>
			)}
			{canEdit &&
				(editing === "new" ? (
					<LexicalFormForm
						entryId={entry.id}
						onCancel={() => setEditing(null)}
						onSaved={async () => {
							await onChanged()
							setEditing(null)
						}}
					/>
				) : (
					<p className='text-sm'>
						<button type='button' onClick={() => setEditing("new")} className={LINK_BUTTON}>
							Lägg till variant eller böjd form
						</button>
					</p>
				))}
		</div>
	)
}

function EntryItem({
	entry,
	canEdit,
	canRemove,
	onSave,
	onRemove,
	onFormsChanged,
	onQuizMark,
}: {
	entry: LexicalEntry
	canEdit: boolean
	canRemove: boolean
	onSave: (data: LexicalEntryCreate) => Promise<void>
	onRemove: () => Promise<void>
	onFormsChanged: () => Promise<void>
	/** Lägger ordet i ens glosförhör, eller tar det ur dem. */
	onQuizMark: () => Promise<void>
}) {
	const [editing, setEditing] = useState(false)
	const [removing, setRemoving] = useState(false)
	const [marking, setMarking] = useState(false)
	const modernForm = modernFormOf(entry)
	const synonyms = synonymsOf(entry).map(synonym => synonym.text)
	const connotations = entry.connotations ?? []
	const facts = [
		modernForm && `Modernt: ${modernForm}`,
		entry.part_of_speech,
		entry.gender,
		entry.language,
		entry.in_quiz && "i förhör",
	].filter(Boolean)

	if (editing) {
		return (
			<li className='border-b border-border py-5'>
				<div className='max-w-2xl'>
					<EntryForm
						entry={entry}
						submitLabel='Spara'
						onCancel={() => setEditing(false)}
						onSubmit={async data => {
							await onSave(data)
							setEditing(false)
						}}
					/>
				</div>
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
				{entry.translation && <p className='font-display text-lg font-semibold text-text'>{entry.translation}</p>}
				{entry.definition ? (
					<p className='font-display text-lg leading-relaxed text-text'>{entry.definition}</p>
				) : (
					!entry.translation && <p className='font-display text-lg italic text-text-muted'>Ingen definition</p>
				)}
				{synonyms.length > 0 && <p className='mt-1 text-sm text-text-muted'>Synonymer: {synonyms.join(", ")}</p>}
					{(connotations.length > 0 || entry.connotation_note) && (
						<p className='mt-1 text-sm text-text-muted'>
							{[connotations.length > 0 && `Konnotation: ${connotations.join(", ")}`, entry.connotation_note]
								.filter(Boolean)
								.join(" – ")}
						</p>
					)}
				<LexicalForms entry={entry} canEdit={canEdit} onChanged={onFormsChanged} />
			</div>
			{/* Förhörsmarkeringen är ens egen, så den finns på alla ord man ser. */}
			<div className='flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-sm'>
				<button
					type='button'
					aria-pressed={entry.in_quiz}
					disabled={marking}
					onClick={async () => {
						setMarking(true)
						try {
							await onQuizMark()
						} finally {
							setMarking(false)
						}
					}}
					className={LINK_BUTTON}>
					{entry.in_quiz ? "Ta ur förhör" : "Lägg i förhör"}
				</button>
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
		</li>
	)
}

/**
 * En ordlista, en sida ord i taget; sökningen görs i API:t. Ägaren kan redigera listan och lägga
 * till, ändra och ta bort ord.
 */
export default function GlossaryView({
	glossary: initial,
	firstPage,
}: {
	glossary: GlossaryDetail
	firstPage: LexicalEntryPage
}) {
	const user = useUser()
	const router = useRouter()
	const [glossary, setGlossary] = useState(initial)
	const [editingDetails, setEditingDetails] = useState(false)
	const [adding, setAdding] = useState(false)
	const [query, setQuery] = useState("")
	// Sökningen skickas först när man slutat skriva.
	const [search, setSearch] = useState("")
	const [page, setPage] = useState(1)
	// Räknas upp när sidan ska hämtas om, efter att ett ord lagts till eller tagits bort.
	const [version, setVersion] = useState(0)
	const [error, setError] = useState<string | null>(null)
	const isOwner = glossary.owner === user?.id

	const requestKey = JSON.stringify([page, search, version])
	const loadedKey = useRef(requestKey)
	// Förra sidan står kvar tills nästa har kommit, så att listan inte blinkar.
	const [loaded, setLoaded] = useState({ key: requestKey, data: firstPage })
	const { data } = loaded
	const loading = loaded.key !== requestKey
	const pageCount = Math.max(1, Math.ceil(data.count / GLOSSARY_PAGE_SIZE))

	useEffect(() => {
		const timeout = setTimeout(() => {
			setSearch(query.trim())
			setPage(1)
		}, 300)
		return () => clearTimeout(timeout)
	}, [query])

	useEffect(() => {
		if (loadedKey.current === requestKey) return
		let active = true
		listGlossaryEntries(glossary.id, page, search)
			.then(result => {
				if (!active) return
				loadedKey.current = requestKey
				setLoaded({ key: requestKey, data: result })
			})
			.catch(() => {
				if (!active) return
				setLoaded(current => ({ ...current, key: requestKey }))
				setError("Orden kunde inte hämtas.")
			})
		return () => {
			active = false
		}
	}, [requestKey, glossary.id, page, search])

	function goToPage(next: number) {
		setPage(next)
		window.scrollTo({ top: 0 })
	}

	/** Byter ut ett ord på sidan mot dess nya uppgifter, utan att hämta om de andra. */
	function replaceEntry(saved: LexicalEntry) {
		setLoaded(current => ({
			...current,
			data: { ...current.data, results: current.data.results.map(item => (item.id === saved.id ? saved : item)) },
		}))
	}

	/** Efter att ett ord lagts till eller tagits bort: antalet ändras och sidan hämtas om. */
	function entryCountChanged(change: 1 | -1) {
		setGlossary(current => ({ ...current, entry_count: current.entry_count + change }))
		if (change === -1 && data.results.length === 1 && page > 1) setPage(page - 1)
		else setVersion(current => current + 1)
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
			entryCountChanged(-1)
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
				<section className='max-w-xl'>
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
						<h1 className='font-display text-3xl font-bold text-text'>{glossary.title}</h1>
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
					{glossary.entry_count > 0 && (
						<div className='flex w-full flex-col gap-3 sm:w-72'>
							<LinkButton href={`/ordlistor/${glossary.id}/forhor`} variant='secondary' className='justify-center'>
								Glosförhör
							</LinkButton>
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
					{search ? `${data.count} av ${glossary.entry_count} ord` : `${glossary.entry_count} ord`} ·{" "}
					{glossary.is_private ? "Privat" : "Offentlig"}
				</span>
			</Divider>

			{error && (
				<p role='alert' className='my-3 text-sm text-danger'>
					{error}
				</p>
			)}

			{glossary.entry_count === 0 && !adding && (
				<p className='my-10 text-center font-display text-lg text-text-muted'>
					{isOwner
						? "Inga ord än. Lägg till ett här, eller markera ett ord i en text och skapa en definition."
						: "Inga ord än."}
				</p>
			)}

			{data.results.length > 0 && (
				<div aria-busy={loading} className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
					<ul className='my-4 flex flex-col'>
						{data.results.map(entry => (
							<EntryItem
								key={entry.id}
								entry={entry}
								canEdit={entry.can_edit}
								canRemove={isOwner}
								onQuizMark={async () => {
									setError(null)
									try {
										await setQuizMark(entry.id, !entry.in_quiz)
										replaceEntry({ ...entry, in_quiz: !entry.in_quiz })
									} catch {
										setError("Markeringen kunde inte sparas.")
									}
								}}
								onSave={async changes => replaceEntry(await updateLexicalEntry(entry.id, changes))}
								onRemove={() => handleRemoveEntry(entry.id)}
								onFormsChanged={async () => replaceEntry(await getLexicalEntry(entry.id))}
							/>
						))}
					</ul>
					{pageCount > 1 && (
						<nav
							aria-label='Sidor med ord'
							className='grid grid-cols-[1fr_auto_1fr] items-baseline gap-x-4 text-sm text-text-muted'>
							<span>
								{page > 1 && (
									<button type='button' onClick={() => goToPage(page - 1)} className={PAGER_BUTTON}>
										Föregående
									</button>
								)}
							</span>
							<span className='font-display italic oldstyle-nums'>
								Sida {page} av {pageCount}
							</span>
							<span className='justify-self-end'>
								{page < pageCount && (
									<button type='button' onClick={() => goToPage(page + 1)} className={PAGER_BUTTON}>
										Nästa
									</button>
								)}
							</span>
						</nav>
					)}
				</div>
			)}
			{search && data.count === 0 && glossary.entry_count > 0 && (
				<p className='my-10 text-center font-display text-lg italic text-text-muted'>Inga ord matchar sökningen.</p>
			)}

			{isOwner &&
				(adding ? (
					<section className='my-6 max-w-2xl'>
						<EntryForm
							submitLabel='Lägg till'
							onCancel={() => setAdding(false)}
							onSubmit={async data => {
								const entry = await createLexicalEntry(data)
								await addGlossaryEntry(glossary.id, entry.id)
								entryCountChanged(1)
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
