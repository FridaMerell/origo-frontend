import type {
	FormGrammar,
	LexicalEntry,
	LexicalForm,
	LexicalFormKind,
	LexicalSynonym,
	LexicalSynonymInput,
} from "@/app/lib/dal/opus"

export const FORM_KIND_LABELS: Record<LexicalFormKind, string> = {
	spelling: "Stavningsvariant",
	inflection: "Böjd form",
}

type GrammarKey = keyof FormGrammar

/** Egenskaperna i den ordning de beskrivs, t.ex. "genitiv plural" eller "3:e person singular presens indikativ". */
export const GRAMMAR_KEYS: GrammarKey[] = [
	"grammatical_case",
	"person",
	"number",
	"tense",
	"mood",
	"voice",
	"degree",
	"definiteness",
]

export const GRAMMAR_LABELS: Record<GrammarKey, string> = {
	grammatical_case: "Kasus",
	person: "Person",
	number: "Numerus",
	tense: "Tempus",
	mood: "Modus",
	voice: "Genus verbi",
	degree: "Komparation",
	definiteness: "Bestämdhet",
}

/** Värdena är API:ts; etiketterna är det som visas. */
export const GRAMMAR_OPTIONS: Record<GrammarKey, { value: string; label: string }[]> = {
	grammatical_case: [
		{ value: "nominative", label: "nominativ" },
		{ value: "genitive", label: "genitiv" },
		{ value: "dative", label: "dativ" },
		{ value: "accusative", label: "ackusativ" },
		{ value: "ablative", label: "ablativ" },
		{ value: "vocative", label: "vokativ" },
		{ value: "locative", label: "lokativ" },
		{ value: "instrumental", label: "instrumentalis" },
	],
	person: [
		{ value: "1", label: "1:a person" },
		{ value: "2", label: "2:a person" },
		{ value: "3", label: "3:e person" },
	],
	number: [
		{ value: "singular", label: "singular" },
		{ value: "plural", label: "plural" },
		{ value: "dual", label: "dual" },
	],
	tense: [
		{ value: "present", label: "presens" },
		{ value: "past", label: "preteritum" },
		{ value: "imperfect", label: "imperfekt" },
		{ value: "perfect", label: "perfekt" },
		{ value: "pluperfect", label: "pluskvamperfekt" },
		{ value: "future", label: "futurum" },
		{ value: "future_perfect", label: "futurum exaktum" },
		{ value: "aorist", label: "aorist" },
	],
	mood: [
		{ value: "indicative", label: "indikativ" },
		{ value: "subjunctive", label: "konjunktiv" },
		{ value: "optative", label: "optativ" },
		{ value: "imperative", label: "imperativ" },
		{ value: "infinitive", label: "infinitiv" },
		{ value: "participle", label: "particip" },
		{ value: "supine", label: "supinum" },
		{ value: "gerund", label: "gerundium" },
	],
	voice: [
		{ value: "active", label: "aktiv" },
		{ value: "passive", label: "passiv" },
		{ value: "middle", label: "medium" },
	],
	degree: [
		{ value: "positive", label: "positiv" },
		{ value: "comparative", label: "komparativ" },
		{ value: "superlative", label: "superlativ" },
	],
	definiteness: [
		{ value: "indefinite", label: "obestämd" },
		{ value: "definite", label: "bestämd" },
	],
}

export function emptyGrammar(): FormGrammar {
	return {
		grammatical_case: "",
		person: "",
		number: "",
		tense: "",
		mood: "",
		voice: "",
		degree: "",
		definiteness: "",
	}
}

/** De strukturerade egenskaperna ur en form (eller `undefined`), alltid med alla nycklar. */
export function grammarOf(form?: Partial<FormGrammar> | null): FormGrammar {
	const grammar = emptyGrammar()
	for (const key of GRAMMAR_KEYS) grammar[key] = form?.[key] ?? ""
	return grammar
}

/** "genitiv plural"; tom när inga egenskaper är angivna. */
export function describeGrammar(form?: Partial<FormGrammar> | null) {
	const grammar = grammarOf(form)
	return GRAMMAR_KEYS.map(key => GRAMMAR_OPTIONS[key].find(option => option.value === grammar[key])?.label)
		.filter(Boolean)
		.join(" ")
}

/** "böjd form, genitiv plural, pres. ind. 3 sg. · osäker" */
export function describeForm(
	form: Pick<LexicalForm, "kind" | "inflection" | "is_uncertain"> & Partial<FormGrammar>,
) {
	const parts = [FORM_KIND_LABELS[form.kind].toLocaleLowerCase("sv"), describeGrammar(form), form.inflection]
	return [parts.filter(Boolean).join(", "), form.is_uncertain && "osäker"].filter(Boolean).join(" · ")
}

/** Förslag på ordklass; vilken text som helst går att skriva. */
export const PART_OF_SPEECH_SUGGESTIONS = [
	"substantiv",
	"verb",
	"adjektiv",
	"adverb",
	"pronomen",
	"preposition",
	"konjunktion",
	"subjunktion",
	"interjektion",
	"räkneord",
	"particip",
	"artikel",
]

/** "ålderdomlig, högtidlig" → ["ålderdomlig", "högtidlig"], utan tomma och dubbla taggar. */
export function parseTags(text: string) {
	const seen = new Set<string>()
	const tags: string[] = []
	for (const tag of text.split(",").map(item => item.trim())) {
		const key = tag.toLocaleLowerCase("sv")
		if (tag && !seen.has(key)) {
			seen.add(key)
			tags.push(tag)
		}
	}
	return tags
}

/** Ordets synonymer; äldre data kan sakna listan. */
export function synonymsOf(entry: Pick<LexicalEntry, "synonyms"> | null | undefined): LexicalSynonym[] {
	return entry?.synonyms ?? []
}

/** Synonymerna som kommaseparerad text för ett textfält. */
export function synonymText(entry: Pick<LexicalEntry, "synonyms"> | null | undefined) {
	return synonymsOf(entry)
		.map(synonym => synonym.text)
		.join(", ")
}

/** Texten ur fältet som synonymer att spara; en synonym som redan fanns behåller sin koppling till ett ord. */
export function parseSynonyms(text: string, existing: LexicalSynonym[]): LexicalSynonymInput[] {
	return parseTags(text).map(value => {
		const known = existing.find(synonym => sameWord(synonym.text, value))
		return known?.target ? { text: value, target: known.target } : { text: value }
	})
}

/** Så många ord visas per sida i en ordlista. */
export const GLOSSARY_PAGE_SIZE = 50

/** Språkets svenska namn, t.ex. "la" → "Latin"; en kod utan namn visas som den är. */
export function languageName(code: string) {
	try {
		const name = new Intl.DisplayNames(["sv"], { type: "language", fallback: "code" }).of(code) ?? code
		return name.charAt(0).toLocaleUpperCase("sv") + name.slice(1)
	} catch {
		return code
	}
}

/** Samma ord oavsett versaler, som backendens `iexact`. */
export function sameWord(a: string, b: string) {
	return a.trim().toLocaleLowerCase("sv") === b.trim().toLocaleLowerCase("sv")
}
