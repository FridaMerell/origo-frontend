import React from "react"
import type { ReadingAnnotation, ReadingGloss } from "@/app/lib/dal/opus"
import { describeForm, sameWord } from "../../../ordlistor/lexical-forms"
import { explanationOf } from "../_word-panel/word-panel"

/** Markeringsstilen som delas av "ny annotation väljs" och "ord valt för delning" (utan pil, utan tooltip). */
const PENDING_MARK_CLASS = "bg-primary/20 underline decoration-primary decoration-2 underline-offset-4 rounded-[2px]"

const TERM_MARK_CLASS = "bg-transparent text-primary underline decoration-dotted decoration-primary/60 underline-offset-4"

/** Rutan som visas när man håller över ett ord med definition. Dess text räknas inte till styckets (se getTextOffset). */
function TermCard({
	text,
	entry,
	form,
	explanation,
	hint,
	shift = 0,
}: {
	text: string
	entry: ReadingAnnotation["lexical_entry"]
	form?: ReadingGloss["form"]
	explanation: string
	hint?: string
	/** Hur långt rutan flyttas i sidled från ordets vänsterkant för att hållas innanför fönstret. */
	shift?: number
}) {
	const modernForm = entry?.inflection_data?.modern_form
	const synonyms = (entry?.synonyms ?? []).map(synonym => synonym.text)
	const connotation = [
		entry?.connotations?.length ? `Konnotation: ${entry.connotations.join(", ")}` : "",
		entry?.connotation_note ?? "",
	]
		.filter(Boolean)
		.join(" – ")
	return (
		<span
			data-term-card
			style={{ left: shift }}
			className="pointer-events-none absolute top-full z-30 mt-2 hidden w-60 max-w-[calc(100vw-24px)] rounded-md bg-bg p-3 text-left text-[13px] font-normal text-text shadow-xl ring-1 ring-text/15 transition-opacity starting:opacity-0 group-hover/term:block group-focus-within/term:block">
			<span className="block text-[10px] uppercase tracking-[0.2em] text-text-muted">
				Ordlista
			</span>
			<span className="mt-1 block font-display text-lg font-bold text-text">
				{text}
			</span>
			{entry && !sameWord(entry.lemma, text) && (
				<span className="mt-1 block text-text">
					Grundform: <span className="font-medium text-text">{entry.lemma}</span>
					{form && <span className="text-text-muted"> · {describeForm(form)}</span>}
				</span>
			)}
			{typeof modernForm === "string" && modernForm && (
				<span className="mt-1 block text-text">
					Modernt: <span className="font-medium text-text">{modernForm}</span>
					{entry?.part_of_speech && <> · {entry.part_of_speech}</>}
				</span>
			)}
			{entry?.translation && (
				<span className="mt-0.5 block text-text">
					Översättning: <span className="font-medium text-text">{entry.translation}</span>
				</span>
			)}
			{synonyms.length > 0 && (
				<span className="mt-0.5 block text-xs text-text">
					Synonymer: {synonyms.join(", ")}
				</span>
			)}
			{connotation && <span className="mt-0.5 block text-xs text-text">{connotation}</span>}
			{explanation && <span className="mt-1 block text-text">{explanation}</span>}
			{hint && <span className="mt-2 block text-[11px] text-text-muted">{hint}</span>}
		</span>
	)
}

/** Minsta avstånd mellan ordlisterutan och fönstrets kant, och rutans bredd (w-60). */
const EDGE = 12
const CARD_WIDTH = 240

/**
 * Ett ord med ordlisteruta. Rutan är dold (display: none) tills den visas, så att den inte gör
 * sidan bredare, och flyttas då i sidled så att den hålls innanför fönstret.
 */
function Term({ children, ...card }: { children: React.ReactNode } & React.ComponentProps<typeof TermCard>) {
	const [shift, setShift] = React.useState(0)

	function place(event: React.SyntheticEvent<HTMLSpanElement>) {
		const word = event.currentTarget.getBoundingClientRect()
		const viewport = document.documentElement.clientWidth
		const width = Math.min(CARD_WIDTH, viewport - 2 * EDGE)
		setShift(Math.max(EDGE - word.left, Math.min(0, viewport - EDGE - width - word.left)))
	}

	return (
		<span className="group/term relative inline-block" onPointerEnter={place} onFocus={place}>
			{children}
			<TermCard {...card} shift={shift} />
		</span>
	)
}

/** Styckets text med annotationer, kända ord och en pågående markering utritade. */
export function highlightContent(
	content: string,
	annotations: ReadingAnnotation[],
	glosses: ReadingGloss[],
	pending: { start: number; end: number } | null | undefined,
	onEdit: (annotation: ReadingAnnotation, anchor: HTMLElement) => void,
	/** Öppnar ett känt ord för redigering; `canEditGloss` avgör vilka ord som är ens egna. */
	onEditGloss: (gloss: ReadingGloss, anchor: HTMLElement) => void,
	canEditGloss: (gloss: ReadingGloss) => boolean,
): React.ReactNode {
	// Kända ord som API:t hittat i texten ritas som definitioner, utan att vara annotationer.
	const spans: { start: number; end: number; annotation?: ReadingAnnotation; gloss?: ReadingGloss }[] = [
		...annotations
			.filter(a => a.start_offset != null && a.end_offset != null)
			.map(a => ({ start: a.start_offset!, end: a.end_offset!, annotation: a })),
		...glosses
			// Ett ord som håller på att markeras visas som markerat, inte som känt ord.
			.filter(gloss => !pending || gloss.end_offset <= pending.start || gloss.start_offset >= pending.end)
			.map(gloss => ({ start: gloss.start_offset, end: gloss.end_offset, gloss })),
	].sort((a, b) => a.start - b.start)

	// En text som ännu inte är en annotation (under markering) ritas som samma stil, ovanpå
	// den vanliga texten. Den överlappar inte redan sparade annotationer i praktiken, eftersom
	// man markerar ny text för en ny annotation.
	function plain(text: string, absoluteStart: number, key: string): React.ReactNode {
		if (!pending) return text
		const start = Math.max(absoluteStart, pending.start)
		const end = Math.min(absoluteStart + text.length, pending.end)
		if (start >= end) return text
		const before = text.slice(0, start - absoluteStart)
		const marked = text.slice(start - absoluteStart, end - absoluteStart)
		const after = text.slice(end - absoluteStart)
		return (
			<React.Fragment key={key}>
				{before}
				{/* Ordpanelen hålls vid det här elementet (se selectRange i UnitText). */}
				<mark data-pending-mark className={PENDING_MARK_CLASS}>{marked}</mark>
				{after}
			</React.Fragment>
		)
	}

	if (spans.length === 0) return plain(content, 0, "plain")

	const nodes: React.ReactNode[] = []
	let cursor = 0

	for (const span of spans) {
		if (span.start > cursor) {
			nodes.push(plain(content.slice(cursor, span.start), cursor, `plain-${cursor}`))
		}
		const text = content.slice(span.start, span.end)
		const { annotation, gloss } = span
		if (annotation) {
			const isDefinition = annotation.kind === "definition"
			// Markeringen ligger under ordet (underline-offset), inte som en färgad text ovanpå det.
			const mark = (
				<mark
					key={`${span.start}-${span.end}`}
					tabIndex={0}
					title={isDefinition ? undefined : "Redigera annotationen"}
					onClick={event => onEdit(annotation, event.currentTarget)}
					onKeyDown={event => {
						if (event.key === "Enter") onEdit(annotation, event.currentTarget)
					}}
					className={`cursor-pointer ${TERM_MARK_CLASS}`}>
					{text}
				</mark>
			)
			nodes.push(
				isDefinition ? (
					<Term
						key={`${span.start}-${span.end}-term`}
						text={text}
						entry={annotation.lexical_entry}
						explanation={explanationOf(annotation)}
						hint="Klicka för att redigera">
						{mark}
					</Term>
				) : (
					mark
				),
			)
		} else if (gloss) {
			const editable = canEditGloss(gloss)
			nodes.push(
				<Term
					key={`${span.start}-${span.end}-term`}
					text={text}
					entry={gloss.lexical_entry}
					form={gloss.form}
					explanation={gloss.lexical_entry.definition}
					hint={editable ? "Klicka för att redigera" : undefined}>
					<mark
						tabIndex={0}
						onClick={editable ? event => onEditGloss(gloss, event.currentTarget) : undefined}
						onKeyDown={event => {
							if (editable && event.key === "Enter") onEditGloss(gloss, event.currentTarget)
						}}
						className={editable ? `cursor-pointer ${TERM_MARK_CLASS}` : TERM_MARK_CLASS}>
						{text}
					</mark>
				</Term>,
			)
		}
		cursor = span.end
	}

	if (cursor < content.length) {
		nodes.push(plain(content.slice(cursor), cursor, `plain-${cursor}`))
	}

	return nodes
}
