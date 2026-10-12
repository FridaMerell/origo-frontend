"use client"
import { ReadingAnnotation, ReadingGloss, ReadingUnit } from "@/app/lib/dal/opus"
import React, { useState, useRef, useEffect, useCallback } from "react"
import { ArrowRightIcon, MoreHorizontalIcon, PencilIcon, XIcon } from "lucide-react"
import Menu from "./Menu"
import {
	combineUnits,
	deleteUnit,
	splitUnit,
	updateUnitContent,
	type UnitEditResult,
} from "../../_actions/alignment-actions"
import { deleteAnnotation } from "../../_actions/annotation-actions"
import { TextAreaField } from "../../forms/Fields/Fields"
import { describeForm, sameWord } from "../../ordlistor/lexical-forms"
import WordPanel from "./WordPanel"
import type { Anchor } from "./usePanelPlacement"
import { explanationOf, type PanelTarget } from "./word-panel"

const BOUNDARY_CHAR = /[\s.,!?;:()[\]{}"'»«]/

/** Backends reject offsets that don't align to a whole token, so trim any
 *  incidental punctuation/whitespace a mouse drag picked up at the edges. */
function trimToTokenBounds(content: string, start: number, end: number): [number, number] {
	let s = start
	let e = end
	while (s < e && BOUNDARY_CHAR.test(content[s])) s++
	while (e > s && BOUNDARY_CHAR.test(content[e - 1])) e--
	return [s, e]
}

function getTextOffset(container: Node, targetNode: Node, targetOffset: number): number {
	let offset = 0
	// Definitionsrutorna ligger i samma element som texten men hör inte till den.
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, node =>
		node.parentElement?.closest("[data-term-card]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
	)
	let node: Node | null
	while ((node = walker.nextNode())) {
		if (node === targetNode) {
			return offset + targetOffset
		}
		offset += (node as Text).length
	}
	return offset
}

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
}: {
	text: string
	entry: ReadingAnnotation["lexical_entry"]
	form?: ReadingGloss["form"]
	explanation: string
	hint?: string
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
			className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-60 rounded-md bg-bg p-3 text-left text-[13px] font-normal text-text opacity-0 shadow-xl ring-1 ring-text/15 transition-opacity group-hover/term:opacity-100 group-focus-within/term:opacity-100">
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

function highlightContent(
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
				{/* Ordpanelen hålls vid det här elementet (se selectRange). */}
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
					<span key={`${span.start}-${span.end}-term`} className="group/term relative inline-block">
						{mark}
						<TermCard
							text={text}
							entry={annotation.lexical_entry}
							explanation={explanationOf(annotation)}
							hint="Klicka för att redigera"
						/>
					</span>
				) : (
					mark
				),
			)
		} else if (gloss) {
			const editable = canEditGloss(gloss)
			nodes.push(
				<span key={`${span.start}-${span.end}-term`} className="group/term relative inline-block">
					<mark
						tabIndex={0}
						onClick={editable ? event => onEditGloss(gloss, event.currentTarget) : undefined}
						onKeyDown={event => {
							if (editable && event.key === "Enter") onEditGloss(gloss, event.currentTarget)
						}}
						className={editable ? `cursor-pointer ${TERM_MARK_CLASS}` : TERM_MARK_CLASS}>
						{text}
					</mark>
					<TermCard
						text={text}
						entry={gloss.lexical_entry}
						form={gloss.form}
						explanation={gloss.lexical_entry.definition}
						hint={editable ? "Klicka för att redigera" : undefined}
					/>
				</span>,
			)
		}
		cursor = span.end
	}

	if (cursor < content.length) {
		nodes.push(plain(content.slice(cursor), cursor, `plain-${cursor}`))
	}

	return nodes
}

type WordToken = { text: string; end: number; isWord: boolean }

/** Delar upp texten i ord och mellanrum, med varje ords slutposition (för delningspunkten). */
function tokenizeWords(content: string): WordToken[] {
	const tokens: WordToken[] = []
	const pattern = /\S+|\s+/g
	let match: RegExpExecArray | null
	while ((match = pattern.exec(content))) {
		tokens.push({ text: match[0], end: match.index + match[0].length, isWord: !/^\s/.test(match[0]) })
	}
	return tokens
}

/** Den öppna ordpanelen: vad den gäller och var i texten den hålls. */
type OpenPanel = { target: PanelTarget; anchor: Anchor }

/**
 * Ett stycke text där man kan markera ord/fraser och skapa annotationer, och redigera,
 * dela eller ta bort själva stycket. `onChanged` laddar om rutnätet efter en ändring.
 */
export default function UnitText({
	unit,
	label,
	language,
	heading,
	onChanged,
}: {
	unit: ReadingUnit
	/** Utgåvans språk; nya ord som skapas från texten får det språket. */
	language: string
	/** Styckets nummer/etikett, visas dämpat ovanför texten. */
	label: string | number
	/** Visas i rubrikraden i stället för `label` (t.ex. utgåvans namn i mobilvyn); `null` visar ingenting. */
	heading?: React.ReactNode
	onChanged: () => void
}) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(unit.content)
	const [unitBusy, setUnitBusy] = useState(false)
	const [unitError, setUnitError] = useState<string | null>(null)
	const [showAnnotations, setShowAnnotations] = useState(false)
	const [splitMode, setSplitMode] = useState(false)
	const [splitAt, setSplitAt] = useState<number | null>(null)
	const [panel, setPanel] = useState<OpenPanel | null>(null)
	const contentRef = useRef<HTMLDivElement>(null)

	/** Öppnar panelen för en ny annotation på markeringen `range` (inom styckets text). */
	const selectRange = useCallback(
		(range: Range) => {
			const container = contentRef.current
			if (!container) return
			const rawStart = getTextOffset(container, range.startContainer, range.startOffset)
			const rawEnd = getTextOffset(container, range.endContainer, range.endOffset)
			const [start, end] = trimToTokenBounds(unit.content, Math.min(rawStart, rawEnd), Math.max(rawStart, rawEnd))
			if (start === end) {
				setPanel(null)
				return
			}
			// Markeringen ritas om som ett eget element (PENDING_MARK_CLASS) som ersätter webbläsarens blå
			// markering. Panelen hålls vid det elementet; det kopierade området gäller tills det har ritats.
			const selected = range.cloneRange()
			window.getSelection()?.removeAllRanges()
			// Ett ord som redan är sparat som en form av ett eget ord knyts dit direkt. Läsvyns data pekar
			// ut de kända orden i stycket, så det behövs ingen fråga till servern.
			const known = unit.glosses.find(
				gloss =>
					gloss.form !== null &&
					gloss.start_offset === start &&
					gloss.end_offset === end &&
					gloss.lexical_entry.can_edit,
			)
			setPanel({
				target: {
					startOffset: start,
					endOffset: end,
					text: unit.content.slice(start, end),
					knownEntry: known?.lexical_entry,
				},
				anchor: {
					getBoundingClientRect: () =>
						(container.querySelector("[data-pending-mark]") ?? selected).getBoundingClientRect(),
				},
			})
		},
		[unit],
	)

	const handleMouseUp = useCallback(() => {
		const container = contentRef.current
		const selection = window.getSelection()
		if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
			setPanel(null)
			return
		}
		const range = selection.getRangeAt(0)
		if (!container.contains(range.commonAncestorContainer)) {
			setPanel(null)
			return
		}
		selectRange(range)
	}, [selectRange])

	// Pekskärm: markeringen görs med handtag och ger inget mouseup. Läs den när den har slutat
	// ändras, och bara när ingen panel redan är öppen (då flyttas markeringen in i formuläret).
	const panelOpen = useRef(false)
	useEffect(() => {
		panelOpen.current = panel !== null
	}, [panel])
	useEffect(() => {
		if (!window.matchMedia("(pointer: coarse)").matches) return
		let timer: number | undefined
		const onChange = () => {
			window.clearTimeout(timer)
			timer = window.setTimeout(() => {
				const container = contentRef.current
				const selection = window.getSelection()
				if (!container || panelOpen.current || !selection || selection.isCollapsed || selection.rangeCount === 0) return
				const range = selection.getRangeAt(0)
				if (container.contains(range.commonAncestorContainer)) selectRange(range)
			}, 600)
		}
		document.addEventListener("selectionchange", onChange)
		return () => {
			window.clearTimeout(timer)
			document.removeEventListener("selectionchange", onChange)
		}
	}, [selectRange])

	/** Öppnar panelen för en befintlig annotation, vid ordet den gäller. */
	function editAnnotation(annotation: ReadingAnnotation, anchor: HTMLElement) {
		if (annotation.start_offset == null || annotation.end_offset == null) return
		setPanel({
			target: {
				startOffset: annotation.start_offset,
				endOffset: annotation.end_offset,
				text: unit.content.slice(annotation.start_offset, annotation.end_offset),
				annotation,
			},
			anchor,
		})
	}

	/** Öppnar panelen för ett eget ord som hittats i texten. */
	function editGloss(gloss: ReadingGloss, anchor: HTMLElement) {
		setPanel({
			target: {
				startOffset: gloss.start_offset,
				endOffset: gloss.end_offset,
				text: unit.content.slice(gloss.start_offset, gloss.end_offset),
				gloss,
			},
			anchor,
		})
	}

	const closePanel = useCallback(() => setPanel(null), [])

	async function runUnitEdit(action: () => Promise<UnitEditResult | void>, after?: () => void) {
		if (unitBusy) return
		setUnitBusy(true)
		setUnitError(null)
		try {
			// Redigeringarna returnerar serverns förklaring (t.ex. att stycket har annotationer),
			// eftersom ett kastat fel tappar sitt meddelande i produktion.
			const result = await action()
			if (result?.error) {
				setUnitError(result.error)
				return
			}
			after?.()
			onChanged()
		} catch {
			setUnitError("Ändringen kunde inte sparas.")
		} finally {
			setUnitBusy(false)
		}
	}

	// Redigera och dela kräver att stycket saknar annotationer (deras teckenpositioner hör till texten).
	function removeAnnotations(ids: number[]) {
		runUnitEdit(async () => {
			for (const id of ids) await deleteAnnotation(id)
		})
	}

	function startEditing() {
		setDraft(unit.content)
		setUnitError(null)
		setEditing(true)
	}

	function handleSave() {
		if (!draft.trim() || draft === unit.content) {
			setEditing(false)
			return
		}
		runUnitEdit(() => updateUnitContent(unit.id, draft), () => setEditing(false))
	}

	function handleCombine() {
		runUnitEdit(() => combineUnits(unit.id, 1))
	}

	function handleDelete() {
		if (!window.confirm("Ta bort stycket? Det går inte att ångra.")) return
		runUnitEdit(() => deleteUnit(unit.id))
	}

	function startSplit() {
		setSplitAt(null)
		setUnitError(null)
		setSplitMode(true)
	}

	function cancelSplit() {
		setSplitMode(false)
		setSplitAt(null)
	}

	function confirmSplit() {
		if (splitAt == null) return
		runUnitEdit(() => splitUnit(unit.id, splitAt), () => setSplitMode(false))
	}

	// En ny markering ritas som markerad text; en annotation eller ett känt ord har redan sin egen markering.
	const selection = panel && !panel.target.annotation && !panel.target.gloss ? panel.target : null

	return (
		<div className='group/unit'>
			{editing ? (
				<div className='flex flex-col gap-2'>
					<TextAreaField
						label='Text'
						value={draft}
						onChange={e => setDraft(e.target.value)}
						rows={Math.min(14, Math.max(3, Math.ceil(draft.length / 45)))}
						autoFocus
					/>
					<div className='flex items-center justify-end gap-3'>
						<button
							type='button'
							onClick={() => setEditing(false)}
							className='font-body text-sm text-text-muted underline underline-offset-4 hover:text-text cursor-pointer'>
							Avbryt
						</button>
						<button
							type='button'
							disabled={unitBusy || !draft.trim()}
							onClick={handleSave}
							className='rounded-md px-3 py-1.5 font-body text-sm font-semibold bg-primary text-bg hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'>
							{unitBusy ? "Sparar…" : "Spara"}
						</button>
					</div>
				</div>
			) : (
				<>
					{/* Rubrikrad: styckets nummer till vänster, en meny med alla åtgärder till höger. */}
					<div className='mb-1 flex items-center justify-between gap-2'>
						{heading !== undefined ? heading : <span className='font-mono text-xs text-text/50'>{label}</span>}
						<Menu
							ariaLabel={`Åtgärder för stycke ${label}`}
							triggerClassName='rounded p-0.5 text-text opacity-0 transition-opacity hover:bg-text/10 pointer-coarse:opacity-100 focus-visible:opacity-100 group-hover/unit:opacity-100 group-focus-within/unit:opacity-100 aria-expanded:opacity-100 cursor-pointer'
							trigger={<MoreHorizontalIcon size={14} />}
							disabled={unitBusy || splitMode}
							items={[
								{
									label: "Redigera texten",
									hint: "Kräver att stycket saknar annotationer",
									onSelect: startEditing,
								},
								{
									label: "Dela stycket…",
									hint: "Kräver att stycket saknar annotationer",
									onSelect: startSplit,
								},
								{
									label: "Kombinera med nästa stycke",
									hint: "Slår ihop texten med nästa stycke i utgåvan, permanent",
									onSelect: handleCombine,
								},
								...(unit.annotations.length > 0
									? [
											{
												label: `Annotationer och noter (${unit.annotations.length})…`,
												onSelect: () => setShowAnnotations(open => !open),
											},
										]
									: []),
								"separator" as const,
								{ label: "Ta bort stycket", danger: true, onSelect: handleDelete },
							]}
						/>
					</div>
					{splitMode ? (
						<div>
							<p className='leading-relaxed'>
								{tokenizeWords(unit.content).map((token, index) =>
									// Efter sista ordet finns ingen text kvar att dela av; det ordet är ingen delningspunkt.
									token.isWord && unit.content.slice(token.end).trim() !== "" ? (
										<span key={index}>
											<button
												type='button'
												onClick={() => setSplitAt(token.end)}
												className={`cursor-pointer rounded px-0.5 -mx-0.5 hover:bg-primary/15 ${
													splitAt === token.end
														? "bg-primary/20 underline decoration-primary decoration-2 underline-offset-2"
														: ""
												}`}>
												{token.text}
											</button>
											{splitAt === token.end && (
												<ArrowRightIcon
													aria-hidden
													size={12}
													className='-mt-1 inline text-primary'
												/>
											)}
										</span>
									) : (
										<span key={index}>{token.text}</span>
									),
								)}
							</p>
							<p className='mt-2 text-xs text-text/80'>
								Klicka på ordet stycket ska delas efter. Pilen visar var delningen sker.
							</p>
							<div className='mt-2 flex items-center gap-3'>
								<button
									type='button'
									onClick={cancelSplit}
									className='font-body text-sm text-text underline underline-offset-4 hover:text-primary cursor-pointer'>
									Avbryt
								</button>
								<button
									type='button'
									disabled={unitBusy || splitAt == null}
									onClick={confirmSplit}
									className='rounded-md px-3 py-1.5 font-body text-sm font-semibold bg-primary text-bg hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'>
									{unitBusy ? "Delar…" : "Dela här"}
								</button>
							</div>
						</div>
					) : (
						<div ref={contentRef} onMouseUp={handleMouseUp}>
							{highlightContent(
								unit.content,
								unit.annotations,
								unit.glosses,
								selection ? { start: selection.startOffset, end: selection.endOffset } : null,
								editAnnotation,
								editGloss,
								gloss => gloss.lexical_entry.can_edit,
							)}
						</div>
					)}
					{!splitMode && (showAnnotations || (unitError && /annotation/i.test(unitError))) && unit.annotations.length > 0 && (
						<div className='mt-2 rounded border border-border bg-surface p-2 text-xs'>
							<p className='mb-1 text-text-muted'>
								Annotationer i stycket. Ta bort dem för att kunna redigera eller dela stycket.
							</p>
							<ul className='flex flex-col gap-1'>
								{unit.annotations.map(annotation => (
									<li key={annotation.id} className='flex items-start justify-between gap-2'>
										<span className='min-w-0'>
											<span className='font-mono text-[10px] uppercase text-text-muted'>{annotation.kind} </span>
											{annotation.start_offset != null && annotation.end_offset != null
												? `»${unit.content.slice(annotation.start_offset, annotation.end_offset)}» `
												: "(hela stycket) "}
											<span className='text-text-muted'>{explanationOf(annotation).slice(0, 60)}</span>
										</span>
										{annotation.start_offset != null && (
											<button
												type='button'
												title='Redigera annotationen'
												aria-label='Redigera annotationen'
												disabled={unitBusy}
												onClick={event => editAnnotation(annotation, event.currentTarget)}
												className='ml-auto shrink-0 text-text-muted hover:text-text disabled:opacity-30 cursor-pointer'>
												<PencilIcon size={12} />
											</button>
										)}
										<button
											type='button'
											title='Ta bort annotationen'
											aria-label='Ta bort annotationen'
											disabled={unitBusy}
											onClick={() => removeAnnotations([annotation.id])}
											className='shrink-0 text-text-muted hover:text-text disabled:opacity-30 cursor-pointer'>
											<XIcon size={12} />
										</button>
									</li>
								))}
							</ul>
							{unit.annotations.length > 1 && (
								<button
									type='button'
									disabled={unitBusy}
									onClick={() => removeAnnotations(unit.annotations.map(annotation => annotation.id))}
									className='mt-2 rounded border border-border px-2 py-1 hover:border-text/40 disabled:opacity-30 cursor-pointer'>
									Ta bort alla ({unit.annotations.length})
								</button>
							)}
						</div>
					)}
				</>
			)}
			{unitError && <p className='mt-1 text-xs text-primary'>{unitError}</p>}

			{panel && (
				<WordPanel
					// En ny markering eller ett annat ord ger en ny panel, ifylld från det ordet.
					key={`${panel.target.startOffset}-${panel.target.endOffset}-${panel.target.annotation?.id ?? (panel.target.gloss ? "ord" : "ny")}`}
					target={panel.target}
					anchor={panel.anchor}
					unitId={unit.id}
					language={language}
					onClose={closePanel}
					onSaved={() => {
						setPanel(null)
						window.getSelection()?.removeAllRanges()
						onChanged()
					}}
				/>
			)}
		</div>
	)
}
