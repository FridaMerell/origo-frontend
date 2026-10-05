import type { LexicalForm, LexicalFormKind } from "@/app/lib/dal/opus"

export const FORM_KIND_LABELS: Record<LexicalFormKind, string> = {
	spelling: "Stavningsvariant",
	inflection: "Böjd form",
}

/** "böjd form, pres. ind. 3 sg. · osäker" */
export function describeForm(form: Pick<LexicalForm, "kind" | "inflection" | "is_uncertain">) {
	const kind = FORM_KIND_LABELS[form.kind].toLocaleLowerCase("sv")
	return [form.inflection ? `${kind}, ${form.inflection}` : kind, form.is_uncertain && "osäker"]
		.filter(Boolean)
		.join(" · ")
}

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
