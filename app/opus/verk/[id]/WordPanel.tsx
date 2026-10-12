"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import type {
	AnnotationKind,
	Glossary,
	Id,
	LexicalEntry,
	LexicalEntryFilters,
	LexicalFormKind,
} from "@/app/lib/dal/opus"
import { deleteAnnotation } from "../../_actions/annotation-actions"
import { deleteLexicalEntry, listLexicalEntries } from "../../_actions/lexical-entry-actions"
import { deleteLexicalForm } from "../../_actions/lexical-form-actions"
import { useReadingGlossaries } from "../../_state/opus-context"
import {
	CheckboxField,
	ComboboxField,
	SelectField,
	TextAreaField,
	TextField,
	type ComboboxOption,
} from "../../forms/Fields/Fields"
import ConnotationFields from "../../ordlistor/ConnotationFields"
import GrammarFields from "../../ordlistor/GrammarFields"
import { FORM_KIND_LABELS, PART_OF_SPEECH_SUGGESTIONS } from "../../ordlistor/lexical-forms"
import { usePanelPlacement, type Anchor } from "./usePanelPlacement"
import {
	canSave,
	initialDraft,
	linkTo,
	saveWord,
	savesForm,
	type FormDraft,
	type PanelTarget,
	type WordDraft,
} from "./word-panel"

const ANNOTATION_KINDS: { value: AnnotationKind; label: string }[] = [
	{ value: "definition", label: "Definition" },
	{ value: "note", label: "Anteckning" },
	{ value: "reference", label: "Hänvisning" },
]

/** Panelens steg. Fälten är fördelade på steg så att rutan är lika stor vad man än fyller i. */
type Step = "meaning" | "form" | "inflection" | "lists"

const CHIP = "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer"
const CHIP_ON = "border-primary bg-primary text-bg"
const CHIP_OFF = "border-text/30 text-text-muted hover:border-primary hover:text-primary"
const TEXT_BUTTON =
	"font-body text-sm text-text-muted underline underline-offset-4 disabled:opacity-40 cursor-pointer"

/** Panelens höjd i sitt högsta steg (Böjning). Platsen vid ordet väljs efter den, så att panelen står still mellan stegen. */
const TALLEST_PANEL = 540

/** Så många ord en sökruta hämtar som förslag; den som inte hittar sitt ord skriver mer. */
const SUGGESTION_COUNT = "20"

/** Ändrar fält i utkastet. */
type Update = (patch: Partial<WordDraft>) => void

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
function BodyField({
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
function MeaningStep({ draft, update, required }: { draft: WordDraft; update: Update; required: boolean }) {
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
function FormStep({ draft, update, target }: { draft: WordDraft; update: Update; target: PanelTarget }) {
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
function FormOfStep({ draft, update, target }: { draft: WordDraft; update: Update; target: PanelTarget }) {
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
function ListsStep({
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

/**
 * Den flytande panelen vid ett markerat ord i läsvyn: en ny annotation, en befintlig, eller ett känt
 * ord. Den byggs upp från `target` när den öppnas, så en ny markering ska ge en ny panel (`key`).
 */
export default function WordPanel({
	target,
	anchor,
	unitId,
	language,
	onClose,
	onSaved,
}: {
	target: PanelTarget
	/** Ordet i texten som panelen hålls vid. */
	anchor: Anchor
	unitId: Id
	/** Utgåvans språk; ett nytt ord får det språket. */
	language: string
	onClose: () => void
	/** Något sparades eller togs bort: stäng panelen och hämta om texten. */
	onSaved: () => void
}) {
	const ownGlossaries = useReadingGlossaries()
	const [draft, setDraft] = useState(() => initialDraft(target))
	const [step, setStep] = useState<Step>("meaning")
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const panelRef = useRef<HTMLDivElement>(null)
	const placement = usePanelPlacement(anchor, panelRef, TALLEST_PANEL)

	const update: Update = patch => setDraft(current => ({ ...current, ...patch }))

	useEffect(() => {
		const onMouseDown = (event: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(event.target as Node)) onClose()
		}
		document.addEventListener("mousedown", onMouseDown)
		return () => document.removeEventListener("mousedown", onMouseDown)
	}, [onClose])

	const definesWord = !draft.formOnly && draft.kind === "definition"
	// I "Form av…" finns steget Böjning från början, så att stegraden inte ändras när ett ord väljs.
	const inflected = draft.form.kind === "inflection" && (draft.formOnly || savesForm(draft, target))
	const steps: { id: Step; label: string }[] = [
		...(definesWord ? [{ id: "meaning" as const, label: "Betydelse" }] : []),
		...(definesWord || draft.formOnly ? [{ id: "form" as const, label: draft.formOnly ? "Ord" : "Form" }] : []),
		...(inflected ? [{ id: "inflection" as const, label: "Böjning" }] : []),
		...(definesWord && ownGlossaries.length > 0 ? [{ id: "lists" as const, label: "Ordlistor" }] : []),
	]
	// Ett steg som inte längre finns (t.ex. Böjning efter att grundformen tagits bort) ersätts av det första.
	const shown = steps.some(item => item.id === step) ? step : steps[0]?.id

	/** Kör en ändring mot servern; lyckas den stängs panelen och texten hämtas om. */
	async function run(action: () => Promise<unknown>, failure: string) {
		setBusy(true)
		setError(null)
		try {
			await action()
			onSaved()
		} catch (cause) {
			// Serverns svar syns i webbläsarens konsol; meddelandet i panelen är medvetet kort.
			console.error("Opus: ändringen i ordpanelen misslyckades", cause)
			setError(failure)
			setBusy(false)
		}
	}

	function handleSubmit(event: FormEvent) {
		event.preventDefault()
		if (!canSave(draft, target)) return
		run(
			() => saveWord({ draft, target, unitId, language }),
			// En rad: platsen för felmeddelandet är reserverad och rutan ska inte växa.
			target.annotation?.lexical_entry ? "Kunde inte spara. Ordet kan tillhöra någon annan." : "Kunde inte spara.",
		)
	}

	function confirmAndRun(question: string, action: () => Promise<unknown>, failure: string) {
		if (window.confirm(question)) run(action, failure)
	}

	const { annotation, gloss } = target
	let content: ReactNode
	if (draft.formOnly && shown === "form") content = <FormOfStep draft={draft} update={update} target={target} />
	else if (shown === "meaning") content = <MeaningStep draft={draft} update={update} required={!gloss} />
	else if (shown === "form") content = <FormStep draft={draft} update={update} target={target} />
	else if (shown === "inflection")
		content = (
			<GrammarFields
				value={draft.form.grammar}
				onChange={grammar => update({ form: { ...draft.form, grammar } })}
				className='grid grid-cols-2 gap-x-2 gap-y-3'
			/>
		)
	else if (shown === "lists")
		content = (
			<ListsStep glossaries={ownGlossaries} chosen={draft.glossaryIds} onChange={glossaryIds => update({ glossaryIds })} />
		)
	// En anteckning eller hänvisning har bara sin text.
	else content = <BodyField draft={draft} update={update} required rows={4} />

	return (
		<div
			ref={panelRef}
			className={`fixed z-50 ${placement ? "" : "invisible"}`}
			style={{ top: placement?.top ?? 0, left: placement?.left ?? 0 }}>
			<form
				onSubmit={handleSubmit}
				// Samma ram som Opus dialoger: rubrik i rubriktypsnittet, skugga, linje över knapparna.
				className='flex max-h-[85vh] w-96 max-w-[80vw] flex-col overflow-hidden rounded-lg border border-border bg-surface text-text shadow-xl'
				style={placement?.maxHeight ? { maxHeight: placement.maxHeight } : undefined}
				onKeyDown={event => {
					if (event.key === "Escape") onClose()
				}}>
				<div className='flex shrink-0 items-baseline justify-between gap-4 border-b border-border px-5 py-3'>
					<h2 className='m-0 truncate font-display text-lg font-semibold text-text'>{target.text}</h2>
					<p className='m-0 shrink-0 text-sm text-text-muted'>
						{gloss ? "Redigera ord" : annotation ? "Redigera annotation" : "Ny annotation"}
					</p>
				</div>

				{/* Bara fälten rullar om panelen måste kortas (smalt fönster); rubriken och knapparna står kvar. */}
				<div className='flex min-h-0 flex-col overflow-y-auto px-5 pt-4'>
					<div className='flex flex-col gap-3'>
						{!gloss && (
							<div className='flex flex-wrap gap-1.5'>
								{ANNOTATION_KINDS.map(option => {
									const active = !draft.formOnly && option.value === draft.kind
									return (
										<button
											key={option.value}
											type='button'
											aria-pressed={active}
											onClick={() => update({ kind: option.value, formOnly: false })}
											className={`${CHIP} ${active ? CHIP_ON : CHIP_OFF}`}>
											{option.label}
										</button>
									)
								})}
								{!annotation && (
									<button
										type='button'
										aria-pressed={draft.formOnly}
										onClick={() => update({ formOnly: true })}
										className={`${CHIP} ${draft.formOnly ? CHIP_ON : CHIP_OFF}`}>
										Form av…
									</button>
								)}
							</div>
						)}
						{steps.length > 0 && (
							<nav className='flex flex-row gap-5 text-sm' aria-label='Steg i formuläret'>
								{steps.map((item, index) =>
									item.id === shown ? (
										<span key={item.id} aria-current='step' className='font-display font-semibold text-primary'>
											{index + 1}. {item.label}
										</span>
									) : (
										<button
											key={item.id}
											type='button'
											onClick={() => setStep(item.id)}
											className='w-fit cursor-pointer text-left font-display text-text-muted hover:text-primary'>
											{index + 1}. {item.label}
										</button>
									),
								)}
							</nav>
						)}
						{/* Varje steg är så högt som sitt innehåll; raderna för text under fälten är reserverade. */}
						<div className='flex flex-col gap-4'>{content}</div>
					</div>
					{/* Raden för ett felmeddelande tar sin plats även när den är tom. */}
					<p role='alert' className='my-1 min-h-4 truncate text-xs leading-4 text-danger'>
						{error}
					</p>
				</div>

				<div className='flex shrink-0 items-center justify-end gap-4 border-t border-border px-5 py-3'>
					{annotation && (
						<button
							type='button'
							disabled={busy}
							onClick={() =>
								confirmAndRun(
									"Ta bort annotationen? Det går inte att ångra.",
									() => deleteAnnotation(annotation.id),
									"Annotationen kunde inte tas bort.",
								)
							}
							className={`mr-auto ${TEXT_BUTTON} hover:text-danger`}>
							Ta bort
						</button>
					)}
					{gloss && (
						<span className='mr-auto flex flex-wrap gap-x-3'>
							<button
								type='button'
								disabled={busy}
								onClick={() =>
									confirmAndRun(
										`Ta bort ordet ${gloss.lexical_entry.lemma}? Det försvinner ur alla texter och ordlistor, tillsammans med definitionerna som pekar på det, och går inte att ångra.`,
										() => deleteLexicalEntry(gloss.lexical_entry.id),
										"Kunde inte ta bort.",
									)
								}
								className={`${TEXT_BUTTON} hover:text-danger`}>
								Ta bort ordet
							</button>
							{gloss.form && (
								<button
									type='button'
									disabled={busy}
									onClick={() =>
										confirmAndRun(
											`Ta bort »${target.text}» som form av ${gloss.lexical_entry.lemma}?`,
											() => deleteLexicalForm(gloss.form!.id),
											"Kunde inte ta bort.",
										)
									}
									className={`${TEXT_BUTTON} hover:text-danger`}>
									Ta bort formen
								</button>
							)}
						</span>
					)}
					<button type='button' onClick={onClose} className={`${TEXT_BUTTON} hover:text-text`}>
						Avbryt
					</button>
					<button
						type='submit'
						disabled={busy || !canSave(draft, target)}
						className='rounded-md bg-primary px-3 py-1.5 font-body text-sm font-semibold text-bg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50'>
						{busy ? "Sparar…" : "Spara"}
					</button>
				</div>
			</form>
		</div>
	)
}
