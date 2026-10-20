"use client"

import { useEffect, useState } from "react"
import type { Glossary, Id, LexicalEntry, LexicalEntryFilters, LexicalFormKind } from "@/app/lib/dal/opus"
import { listLexicalEntries } from "../../../_actions/lexical-entry-actions"
import {
	CheckboxField,
	ComboboxField,
	SelectField,
	TextAreaField,
	TextField,
	type ComboboxOption,
} from "../../../forms/Fields/Fields"
import ConnotationFields from "../../../ordlistor/ConnotationFields"
import { FORM_KIND_LABELS, PART_OF_SPEECH_SUGGESTIONS } from "../../../ordlistor/lexical-forms"
import { linkTo, savesForm, type FormDraft, type PanelTarget, type WordDraft } from "./word-panel"

/** Så många ord en sökruta hämtar som förslag; den som inte hittar sitt ord skriver mer. */
const SUGGESTION_COUNT = "20"

/** Ändrar fält i utkastet. */
export type Update = (patch: Partial<WordDraft>) => void

/** Resultatet av en sökning bland ord: `done` först när svaret på just den frågan har kommit. */
type FoundEntries = { entries: LexicalEntry[]; done: boolean; failed: boolean }

/**
 * Ord som matchar `filters`, hämtade en stund efter att man slutat skriva; tom utan `filters`.
 * Servern väljer ut de ord användaren får ändra (`editable`) och lämnar de första i bokstavsordning;
 * svaret visas som det kommer.
 */
function useEditableEntries(filters: LexicalEntryFilters | null, delay: number): FoundEntries {
	const key = filters ? JSON.stringify({ ...filters, editable: "true", page_size: SUGGESTION_COUNT }) : null
	const [found, setFound] = useState<{ key: string; entries: LexicalEntry[]; failed: boolean } | null>(null)

	useEffect(() => {
		if (!key) return
		const timer = window.setTimeout(() => {
			listLexicalEntries(JSON.parse(key))
				.then(page => setFound({ key, entries: page.results, failed: false }))
				.catch(cause => {
					// Serverns svar syns i webbläsarens konsol; panelen säger bara att sökningen inte gick.
					console.error("Opus: sökningen bland ord misslyckades", cause)
					setFound({ key, entries: [], failed: true })
				})
		}, delay)
		return () => window.clearTimeout(timer)
	}, [key, delay])

	// Svaret på en tidigare fråga visas inte.
	return found && found.key === key
		? { entries: found.entries, done: true, failed: found.failed }
		: { entries: [], done: false, failed: false }
}

/**
 * Ett ord som förslag i en sökruta: grundformen, och efter den det som skiljer det från andra ord
 * med samma grundform (modern form, ordklass, översättning eller definition).
 */
function entryOption(entry: LexicalEntry): ComboboxOption {
	const modern = entry.inflection_data?.modern_form
	const details = [
		typeof modern === "string" ? modern : "",
		entry.part_of_speech,
		entry.translation || entry.definition,
	].filter(Boolean)
	return {
		key: entry.id,
		value: entry.lemma,
		label: (
			<>
				<span className='font-semibold'>{entry.lemma}</span>
				{details.length > 0 && <span className='text-text-muted'> · {details.join(" · ")}</span>}
			</>
		),
	}
}

/**
 * Ett fält där man skriver ett ord och väljer bland de ord sökningen hittar. Raden under fältet tar
 * sin plats även när den är tom, så att rutan inte ändrar storlek när texten kommer.
 */
function EntrySearchField({
	label,
	value,
	onValueChange,
	found,
	onPick,
	hint,
	alert = false,
	placeholder,
	autoFocus,
}: {
	label: string
	value: string
	onValueChange: (value: string) => void
	found: FoundEntries
	onPick: (entry: LexicalEntry) => void
	hint: string | null
	/** Texten under fältet är ett fel. */
	alert?: boolean
	placeholder: string
	autoFocus?: boolean
}) {
	return (
		<div className='flex flex-col gap-2'>
			<ComboboxField
				label={label}
				value={value}
				onValueChange={onValueChange}
				options={found.entries.map(entryOption)}
				// Förslagen är redan serverns svar på det skrivna.
				filterOptions={false}
				onPick={option => {
					const entry = found.entries.find(item => item.id === option.key)
					if (entry) onPick(entry)
				}}
				maxLength={255}
				placeholder={placeholder}
				autoFocus={autoFocus}
			/>
			<p
				role={alert ? "alert" : undefined}
				className={`min-h-4 truncate text-xs leading-4 ${alert ? "text-danger" : "text-text-muted"}`}>
				{hint}
			</p>
		</div>
	)
}

/** Typ av form, anmärkning om böjningen och om kopplingen till grundformen är osäker. */
function FormKindFields({ form, onChange }: { form: FormDraft; onChange: (form: FormDraft) => void }) {
	return (
		<>
			<div className='grid grid-cols-2 gap-2'>
				<SelectField
					label='Typ'
					value={form.kind}
					onChange={event => onChange({ ...form, kind: event.target.value as LexicalFormKind })}>
					{(Object.keys(FORM_KIND_LABELS) as LexicalFormKind[]).map(value => (
						<option key={value} value={value}>
							{FORM_KIND_LABELS[value]}
						</option>
					))}
				</SelectField>
				{/* En anmärkning passar båda typerna: en böjning i klartext, eller när en stavning var i bruk. */}
				<TextField
					label='Anmärkning'
					value={form.inflection}
					onChange={event => onChange({ ...form, inflection: event.target.value })}
					maxLength={255}
					placeholder={form.kind === "inflection" ? "pres. ind. 3 sg." : "före 1700"}
				/>
			</div>
			<CheckboxField
				label='Osäker grundform'
				checked={form.uncertain}
				onChange={event => onChange({ ...form, uncertain: event.target.checked })}
			/>
		</>
	)
}

/** Definitionen, eller texten i en anteckning eller hänvisning. */
export function BodyField({
	draft,
	update,
	required,
	rows = 2,
}: {
	draft: WordDraft
	update: Update
	required: boolean
	rows?: number
}) {
	return (
		<TextAreaField
			label='Definition eller anteckning'
			value={draft.body}
			onChange={event => update({ body: event.target.value })}
			placeholder='Skriv en kort förklaring…'
			rows={rows}
			required={required}
			autoFocus
		/>
	)
}

/** Steg 1: vad ordet betyder. */
export function MeaningStep({ draft, update, required }: { draft: WordDraft; update: Update; required: boolean }) {
	return (
		<>
			<div className='grid grid-cols-2 gap-2'>
				<TextField
					label='Översättning'
					value={draft.translation}
					onChange={event => update({ translation: event.target.value })}
					maxLength={255}
					placeholder='Kort glosa'
				/>
				<TextField
					label='Synonymer'
					value={draft.synonyms}
					onChange={event => update({ synonyms: event.target.value })}
					placeholder='Kommaseparerade'
				/>
			</div>
			<BodyField draft={draft} update={update} required={required} />
			<div className='grid grid-cols-2 gap-2'>
				<ConnotationFields
					tags={draft.connotations}
					note={draft.connotationNote}
					onTagsChange={connotations => update({ connotations })}
					onNoteChange={connotationNote => update({ connotationNote })}
				/>
			</div>
		</>
	)
}

/** Steg 2: ordklass, modern form och vilken grundform det markerade ordet hör till. */
export function FormStep({ draft, update, target }: { draft: WordDraft; update: Update; target: PanelTarget }) {
	const text = target.text.trim()
	const base = draft.baseForm.trim()
	const linked = savesForm(draft, target)
	// Ord med den skrivna grundformen som lemma. Ett redan valt ord behöver inte slås upp igen.
	const matches = useEditableEntries(linked && draft.baseEntry?.lemma !== base ? { lemma: base } : null, 300)

	let hint: string | null = null
	if (linked) {
		if (draft.baseEntry) hint = `»${text}» sparas som en form av ordet ${draft.baseEntry.lemma}.`
		else if (matches.entries.length > 0) hint = `Ordet ${base} finns redan. Välj det i listan för att knyta formen dit.`
		else hint = `»${text}» sparas som en form av ett nytt ord, ${base}.`
	}

	return (
		<>
			{/* Överst, så att ordklasslistan får plats under fältet. */}
			<div className='grid grid-cols-2 gap-2'>
				<ComboboxField
					label='Ordklass'
					options={PART_OF_SPEECH_SUGGESTIONS}
					value={draft.partOfSpeech}
					onValueChange={partOfSpeech => update({ partOfSpeech })}
					placeholder='verb, substantiv…'
				/>
				<TextField
					label='Modernt'
					value={draft.modernForm}
					onChange={event => update({ modernForm: event.target.value })}
					placeholder='Nutida form'
				/>
			</div>
			{target.gloss ? (
				target.gloss.form && (
					<p className='text-xs text-text-muted'>
						»{target.text}» är en form av {target.gloss.lexical_entry.lemma}. Ändringarna gäller ordet.
					</p>
				)
			) : (
				<EntrySearchField
					label='Grundform'
					value={draft.baseForm}
					// Ett valt ord gäller bara så länge grundformen är dess lemma.
					onValueChange={baseForm =>
						update({ baseForm, baseEntry: draft.baseEntry?.lemma === baseForm.trim() ? draft.baseEntry : null })
					}
					found={matches}
					onPick={entry => update(linkTo(draft, entry, text, true))}
					hint={hint}
					placeholder='Om ordet är böjt eller annorlunda stavat'
				/>
			)}
			{linked && <FormKindFields form={draft.form} onChange={form => update({ form })} />}
		</>
	)
}

/** "Form av…": sök upp ett ord som det markerade ordet är en form av. */
export function FormOfStep({ draft, update, target }: { draft: WordDraft; update: Update; target: PanelTarget }) {
	const text = target.text.trim()
	const query = draft.baseForm.trim()
	// Oavsett språk: ord där det skrivna finns i grundformen, en sparad form, en synonym, den moderna
	// formen eller översättningen.
	const matches = useEditableEntries(!draft.baseEntry && query.length >= 2 ? { search: query } : null, 200)

	let hint: string | null = null
	if (draft.baseEntry) hint = `»${text}» sparas som en form av ${draft.baseEntry.lemma}.`
	else if (matches.failed) hint = "Sökningen gick inte att göra."
	else if (matches.done && matches.entries.length === 0) hint = "Inget av dina ord matchar."

	return (
		<>
			<EntrySearchField
				label='Ord'
				value={draft.baseForm}
				onValueChange={baseForm => update({ baseForm, baseEntry: null })}
				found={matches}
				onPick={entry => update(linkTo(draft, entry, text, false))}
				hint={hint}
				alert={matches.failed}
				placeholder='Sök bland dina ord'
				autoFocus
			/>
			<FormKindFields form={draft.form} onChange={form => update({ form })} />
		</>
	)
}

/** Steg 4: vilka av ens ordlistor ordet ligger i. */
export function ListsStep({
	glossaries,
	chosen,
	onChange,
}: {
	glossaries: Glossary[]
	chosen: Id[]
	onChange: (ids: Id[]) => void
}) {
	return (
		<fieldset className='flex flex-col gap-3'>
			<legend className='sr-only'>Ordlistor</legend>
			{glossaries.map(glossary => (
				<CheckboxField
					key={glossary.id}
					label={glossary.title}
					checked={chosen.includes(glossary.id)}
					onChange={event =>
						onChange(event.target.checked ? [...chosen, glossary.id] : chosen.filter(id => id !== glossary.id))
					}
				/>
			))}
		</fieldset>
	)
}
