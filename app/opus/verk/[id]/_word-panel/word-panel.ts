import type {
	AnnotationKind,
	FormGrammar,
	Id,
	LexicalEntry,
	LexicalEntryUpdate,
	LexicalFormKind,
	ReadingAnnotation,
	ReadingEntry,
	ReadingGloss,
} from "@/app/lib/dal/opus"
import { createAnnotation, updateAnnotation } from "../../../_actions/annotation-actions"
import { createLexicalEntry, setEntryGlossaries, updateLexicalEntry } from "../../../_actions/lexical-entry-actions"
import { createLexicalForm, updateLexicalForm } from "../../../_actions/lexical-form-actions"
import { emptyGrammar, grammarOf, parseSynonyms, parseTags, sameWord, synonymText } from "../../../ordlistor/lexical-forms"

/** Det ordpanelen öppnas för: en ny markering, en befintlig annotation eller ett känt ord i texten. */
export type PanelTarget = {
	startOffset: number
	endOffset: number
	text: string
	/** Satt när panelen redigerar en befintlig annotation i stället för att skapa en ny. */
	annotation?: ReadingAnnotation
	/** Satt när panelen redigerar ett känt ord som hittats i texten, utan annotation. */
	gloss?: ReadingGloss
	/** En ny markering som redan är sparad som en form av det här egna ordet. */
	knownEntry?: ReadingEntry
}

/** Hur det markerade ordet förhåller sig till sin grundform, när det sparas som en form av den. */
export type FormDraft = {
	kind: LexicalFormKind
	/** Fri anmärkning: böjningen i klartext, eller t.ex. när en äldre stavning var i bruk. */
	inflection: string
	grammar: FormGrammar
	uncertain: boolean
}

/** Allt som går att fylla i i ordpanelen. Fälten är text som de står i formuläret. */
export type WordDraft = {
	kind: AnnotationKind
	/** "Form av…": spara bara det markerade ordet som en form av ett befintligt ord, utan annotation. */
	formOnly: boolean
	/** Definitionen, eller anteckningens text. */
	body: string
	translation: string
	synonyms: string
	connotations: string
	connotationNote: string
	partOfSpeech: string
	modernForm: string
	/** Grundformen när det markerade ordet är böjt eller annorlunda stavat; tom när ordet är grundformen. */
	baseForm: string
	/** Ett befintligt ord som det markerade ordet knyts till, i stället för att ett nytt skapas. */
	baseEntry: ReadingEntry | null
	form: FormDraft
	glossaryIds: Id[]
}

/** Definitionens förklaring ligger på ordet; äldre definitioner har den i annotationens text. */
export function explanationOf(annotation: ReadingAnnotation) {
	return annotation.lexical_entry?.definition || annotation.body
}

const EMPTY_FORM: FormDraft = { kind: "inflection", inflection: "", grammar: emptyGrammar(), uncertain: false }

/** Ordets egna uppgifter som de visas i formuläret. */
function wordFields(entry: ReadingEntry) {
	const modern = entry.inflection_data?.modern_form
	return {
		body: entry.definition ?? "",
		translation: entry.translation ?? "",
		synonyms: synonymText(entry),
		connotations: (entry.connotations ?? []).join(", "),
		connotationNote: entry.connotation_note ?? "",
		partOfSpeech: entry.part_of_speech ?? "",
		modernForm: typeof modern === "string" ? modern : "",
		glossaryIds: entry.glossaries,
	}
}

/** Hur `text` redan är sparad som form av `entry`, eller en ny böjd form. */
function formOf(entry: ReadingEntry, text: string): FormDraft {
	const saved = entry.forms.find(form => sameWord(form.form, text))
	return saved
		? { kind: saved.kind, inflection: saved.inflection, grammar: grammarOf(saved), uncertain: saved.is_uncertain }
		: EMPTY_FORM
}

/** Knyter det markerade ordet till `entry` som grundform. `fill` tar också ordets uppgifter därifrån. */
export function linkTo(draft: WordDraft, entry: ReadingEntry, text: string, fill: boolean): WordDraft {
	return {
		...draft,
		...(fill ? wordFields(entry) : {}),
		baseForm: entry.lemma,
		baseEntry: entry,
		form: formOf(entry, text),
	}
}

/** Formuläret som det ser ut när panelen öppnas för `target`. */
export function initialDraft(target: PanelTarget): WordDraft {
	const empty: WordDraft = {
		kind: "definition",
		formOnly: false,
		body: "",
		translation: "",
		synonyms: "",
		connotations: "",
		connotationNote: "",
		partOfSpeech: "",
		modernForm: "",
		baseForm: "",
		baseEntry: null,
		form: EMPTY_FORM,
		glossaryIds: [],
	}
	const text = target.text.trim()
	if (target.gloss) return { ...empty, ...wordFields(target.gloss.lexical_entry) }
	if (target.annotation) {
		const { annotation } = target
		const entry = annotation.lexical_entry
		const draft: WordDraft = {
			...empty,
			...(entry ? wordFields(entry) : {}),
			kind: annotation.kind,
			body: annotation.kind === "definition" ? explanationOf(annotation) : annotation.body,
		}
		// Ett ord vars lemma inte är det markerade ordet är knutet till en grundform.
		return entry && !sameWord(entry.lemma, text) ? linkTo(draft, entry, text, false) : draft
	}
	return target.knownEntry ? linkTo(empty, target.knownEntry, text, true) : empty
}

/** Det markerade ordet sparas som en form: av ett valt ord ("Form av…") eller av en annan grundform. */
export function savesForm(draft: WordDraft, target: PanelTarget) {
	if (draft.formOnly) return draft.baseEntry !== null
	if (draft.kind !== "definition" || target.gloss) return false
	return draft.baseForm.trim() !== "" && !sameWord(draft.baseForm, target.text)
}

/** Om formuläret har det som krävs för att sparas. */
export function canSave(draft: WordDraft, target: PanelTarget) {
	if (target.gloss) return true
	return draft.formOnly ? draft.baseEntry !== null : draft.body.trim() !== ""
}

/** Ordet panelen redan utgår från, om något: det valda grundordet, det kända ordet eller annotationens ord. */
function currentEntry(draft: WordDraft, target: PanelTarget) {
	return draft.baseEntry ?? target.gloss?.lexical_entry ?? target.annotation?.lexical_entry ?? null
}

/** Ordets uppgifter som de skickas till API:t. Förklaringen sparas på ordet så att ordlistor kan visa den. */
function entryPayload(draft: WordDraft, target: PanelTarget): LexicalEntryUpdate {
	const current = currentEntry(draft, target)
	// Övriga uppgifter i inflection_data behålls; synonymerna har flyttat till egna rader.
	const inflectionData: Record<string, unknown> = { ...(current?.inflection_data ?? {}) }
	delete inflectionData.synonyms
	if (draft.modernForm.trim()) inflectionData.modern_form = draft.modernForm.trim()
	else delete inflectionData.modern_form
	return {
		part_of_speech: draft.partOfSpeech.trim(),
		translation: draft.translation.trim(),
		definition: draft.body.trim(),
		inflection_data: inflectionData,
		// En synonym som redan fanns behåller sin koppling till ett ord.
		synonyms: parseSynonyms(draft.synonyms, current?.synonyms ?? []),
		connotations: parseTags(draft.connotations),
		connotation_note: draft.connotationNote.trim(),
	}
}

function formPayload(form: FormDraft) {
	return {
		kind: form.kind,
		// Anmärkningen gäller båda typerna; de grammatiska egenskaperna bara en böjd form.
		inflection: form.inflection.trim(),
		...(form.kind === "inflection" ? form.grammar : emptyGrammar()),
		is_uncertain: form.uncertain,
	}
}

/** Sparar `text` som en form av `entry`: uppdaterar formen om den redan finns, annars skapas den vid `unitId`. */
async function saveForm(entry: Pick<LexicalEntry, "id"> & Pick<ReadingEntry, "forms">, text: string, form: FormDraft, unitId: Id) {
	const saved = entry.forms.find(item => sameWord(item.form, text))
	if (saved) await updateLexicalForm(saved.id, formPayload(form))
	else await createLexicalForm({ entry: entry.id, form: text, unit: unitId, ...formPayload(form) })
}

/**
 * Sparar det som står i panelen. Tre fall: ett känt ord ändras där det ligger, "Form av…" sparar bara
 * formen, och annars sparas en annotation (med ordet, och formen om ordet har en annan grundform).
 */
export async function saveWord({
	draft,
	target,
	unitId,
	language,
}: {
	draft: WordDraft
	target: PanelTarget
	unitId: Id
	/** Utgåvans språk; ett nytt ord får det språket. */
	language: string
}) {
	const text = target.text.trim()

	if (target.gloss) {
		// Alla ställen i texten som känner igen ordet följer med.
		const entry = await updateLexicalEntry(target.gloss.lexical_entry.id, entryPayload(draft, target))
		await setEntryGlossaries(entry.id, entry.glossaries, draft.glossaryIds)
		return
	}

	if (draft.formOnly) {
		if (draft.baseEntry) await saveForm(draft.baseEntry, text, draft.form, unitId)
		return
	}

	let entryId: Id | null = null
	if (draft.kind === "definition") {
		const linked = savesForm(draft, target)
		const lemma = linked ? draft.baseForm.trim() : text
		const annotated = target.annotation?.lexical_entry ?? null
		const data = entryPayload(draft, target)
		let entry: LexicalEntry
		if (linked && draft.baseEntry) {
			entry = await updateLexicalEntry(draft.baseEntry.id, data)
		} else if (annotated && (sameWord(annotated.lemma, lemma) || sameWord(annotated.lemma, text))) {
			// Ordet annotationen redan pekar på. Skapades det från det markerade ordet blir det nu grundformen.
			entry = await updateLexicalEntry(annotated.id, { lemma, ...data })
		} else {
			entry = await createLexicalEntry({ lemma, language, ...data })
		}
		entryId = entry.id
		// Svaret anger vilka av ens ordlistor ordet ligger i nu, oavsett vilket ord det blev.
		await setEntryGlossaries(entry.id, entry.glossaries, draft.glossaryIds)
		if (linked) await saveForm(entry, text, draft.form, unitId)
	}

	// En definitions förklaring ligger på ordet; annotationen bär bara förankringen i texten.
	const body = draft.kind === "definition" ? "" : draft.body.trim()
	if (target.annotation) {
		await updateAnnotation(target.annotation.id, { kind: draft.kind, body, lexical_entry: entryId })
	} else {
		await createAnnotation({
			unit: unitId,
			target_kind: /\s/.test(text) ? "phrase" : "word",
			start_offset: target.startOffset,
			end_offset: target.endOffset,
			kind: draft.kind,
			body,
			lexical_entry: entryId,
		})
	}
}
