"use client"
import { AnnotationKind, Glossary, Id, ReadingAnnotation, ReadingUnit } from "@/app/lib/dal/opus"
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { ArrowRightIcon, MoreHorizontalIcon, PencilIcon, XIcon } from "lucide-react"
import Menu from "./Menu"
import {
	combineUnits,
	deleteUnit,
	splitUnit,
	updateUnitContent,
	type UnitEditResult,
} from "../../_actions/alignment-actions"
import { createAnnotation, deleteAnnotation, updateAnnotation } from "../../_actions/annotation-actions"
import {
	createLexicalEntry,
	getLexicalEntry,
	setEntryGlossaries,
	updateLexicalEntry,
} from "../../_actions/lexical-entry-actions"
import { listGlossaries } from "../../_actions/glossary-actions"
import { useUser } from "@/app/lib/user-context"
import { CheckboxField, TextField, TextAreaField } from "../../forms/Fields/Fields"

const ANNOTATION_KINDS: { value: AnnotationKind; label: string }[] = [
	{ value: "definition", label: "Definition" },
	{ value: "note", label: "Anteckning" },
	{ value: "reference", label: "Hänvisning" },
]

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
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
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

/** Definitionens förklaring ligger på ordet; äldre definitioner har den i annotationens text. */
function explanationOf(annotation: ReadingAnnotation) {
	return annotation.lexical_entry?.definition || annotation.body
}

function highlightContent(
	content: string,
	annotations: ReadingAnnotation[],
	pending: { start: number; end: number } | null | undefined,
	onEdit: (annotation: ReadingAnnotation, anchor: HTMLElement) => void,
): React.ReactNode {
	const spans = annotations
		.filter(a => a.start_offset != null && a.end_offset != null)
		.map(a => ({ start: a.start_offset!, end: a.end_offset!, annotation: a }))
		.sort((a, b) => a.start - b.start)

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
				<mark className={PENDING_MARK_CLASS}>{marked}</mark>
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
		const isDefinition = span.annotation.kind === "definition"
		const text = content.slice(span.start, span.end)
		// Markeringen ligger under ordet (underline-offset), inte som en färgad text ovanpå det.
		const mark = (
			<mark
				key={`${span.start}-${span.end}`}
				tabIndex={0}
				title={isDefinition ? undefined : "Redigera annotationen"}
				onClick={event => onEdit(span.annotation, event.currentTarget)}
				onKeyDown={event => {
					if (event.key === "Enter") onEdit(span.annotation, event.currentTarget)
				}}
				className='cursor-pointer bg-transparent text-primary underline decoration-dotted decoration-primary/60 underline-offset-4'>
				{text}
			</mark>
		)
		nodes.push(
			isDefinition ? (
				<span key={`${span.start}-${span.end}-term`} className="group/term relative inline-block">
					{mark}
					<span className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-60 rounded-md bg-bg p-3 text-left text-[13px] font-normal text-text opacity-0 shadow-xl ring-1 ring-text/15 transition-opacity group-hover/term:opacity-100 group-focus-within/term:opacity-100">
						<span className="block text-[10px] uppercase tracking-[0.2em] text-text-muted">
							Ordlista
						</span>
						<span className="mt-1 block font-display text-lg font-bold text-text">
							{text}
						</span>
						{(() => {
							const entry = span.annotation.lexical_entry
							const modernForm = entry?.inflection_data?.modern_form
							const synonyms = entry?.inflection_data?.synonyms
							return (
								<>
									{typeof modernForm === "string" && modernForm && (
										<span className="mt-1 block text-text">
											Modernt: <span className="font-medium text-text">{modernForm}</span>
											{entry?.part_of_speech && <> · {entry.part_of_speech}</>}
										</span>
									)}
									{Array.isArray(synonyms) && synonyms.length > 0 && (
										<span className="mt-0.5 block text-xs text-text">
											Synonymer: {synonyms.join(", ")}
										</span>
									)}
								</>
							)
						})()}
						{explanationOf(span.annotation) && (
							<span className="mt-1 block text-text">{explanationOf(span.annotation)}</span>
						)}
						<span className="mt-2 block text-[11px] text-text-muted">Klicka för att redigera</span>
					</span>
				</span>
			) : (
				mark
			),
		)
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

type SelectionState = {
	startOffset: number
	endOffset: number
	text: string
	top: number
	bottom: number
	centerX: number
	/** Satt när panelen redigerar en befintlig annotation i stället för att skapa en ny. */
	annotation?: ReadingAnnotation
}

/** Det panelen placeras vid: markeringen (ny annotation) eller det markerade ordet (redigering). */
type Anchor = { getBoundingClientRect(): DOMRect }

/**
 * Ett stycke text där man kan markera ord/fraser och skapa annotationer, och redigera,
 * dela eller ta bort själva stycket. `onChanged` laddar om rutnätet efter en ändring.
 */
export default function UnitText({
	unit,
	label,
	heading,
	onChanged,
}: {
	unit: ReadingUnit
	/** Styckets nummer/etikett, visas dämpat ovanför texten. */
	label: string | number
	/** Visas i rubrikraden i stället för `label` (t.ex. utgåvans namn i mobilvyn); `null` visar ingenting. */
	heading?: React.ReactNode
	onChanged: () => void
}) {
	const onAnnotated = onChanged
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(unit.content)
	const [unitBusy, setUnitBusy] = useState(false)
	const [unitError, setUnitError] = useState<string | null>(null)
	const [showAnnotations, setShowAnnotations] = useState(false)
	const [splitMode, setSplitMode] = useState(false)
	const [splitAt, setSplitAt] = useState<number | null>(null)
	const [pending, setPending] = useState<SelectionState | null>(null)
	const [kind, setKind] = useState<AnnotationKind>("definition")
	const [body, setBody] = useState("")
	const [partOfSpeech, setPartOfSpeech] = useState("")
	const [modernForm, setModernForm] = useState("")
	const [synonyms, setSynonyms] = useState("")
	const [glossaryIds, setGlossaryIds] = useState<Id[]>([])
	// Ordlistorna ordet låg i när panelen öppnades, för att veta vad som ska läggas till och tas bort.
	const [savedGlossaryIds, setSavedGlossaryIds] = useState<Id[]>([])
	const [ownGlossaries, setOwnGlossaries] = useState<Glossary[] | null>(null)
	const [formError, setFormError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)
	const [placement, setPlacement] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
	const contentRef = useRef<HTMLDivElement>(null)
	const panelRef = useRef<HTMLDivElement>(null)
	const rangeRef = useRef<Anchor | null>(null)
	const user = useUser()

	const pendingRef = useRef(pending)
	pendingRef.current = pending

	/** Öppnar panelen för en ny annotation på markeringen `range` (inom styckets text). */
	const selectRange = useCallback((range: Range) => {
		const container = contentRef.current
		if (!container) return
		const sel = window.getSelection()
		const rawStart = getTextOffset(container, range.startContainer, range.startOffset)
		const rawEnd = getTextOffset(container, range.endContainer, range.endOffset)
		const [start, end] = trimToTokenBounds(
			unit.content ?? "",
			Math.min(rawStart, rawEnd),
			Math.max(rawStart, rawEnd),
		)
		if (start === end) {
			setPending(null)
			return
		}
		const rect = range.getBoundingClientRect()
		const selectedText = (unit.content ?? "").slice(start, end)
		rangeRef.current = range.cloneRange()
		// Vår egen markering (samma stil som "ord valt för delning") ersätter webbläsarens
		// blå markering, så bara en markering syns.
		sel?.removeAllRanges()
		setPending({
			startOffset: start,
			endOffset: end,
			text: selectedText,
			top: rect.top,
			bottom: rect.bottom,
			centerX: rect.left + rect.width / 2,
		})
		setKind("definition")
		setBody("")
		setPartOfSpeech("")
		setModernForm("")
		setSynonyms("")
		setGlossaryIds([])
		setSavedGlossaryIds([])
		setFormError(null)
	}, [unit])

	const handleMouseUp = useCallback(() => {
		if (!contentRef.current) return
		const sel = window.getSelection()
		if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
			setPending(null)
			return
		}
		const range = sel.getRangeAt(0)
		if (!contentRef.current.contains(range.commonAncestorContainer)) {
			setPending(null)
			return
		}
		selectRange(range)
	}, [selectRange])

	// Pekskärm: markeringen görs med handtag och ger inget mouseup. Läs den när den har slutat
	// ändras, och bara när ingen panel redan är öppen (då flyttas markeringen in i formuläret).
	useEffect(() => {
		if (!window.matchMedia("(pointer: coarse)").matches) return
		let timer: number | undefined
		const onChange = () => {
			window.clearTimeout(timer)
			timer = window.setTimeout(() => {
				const container = contentRef.current
				const sel = window.getSelection()
				if (!container || pendingRef.current || !sel || sel.isCollapsed || sel.rangeCount === 0) return
				const range = sel.getRangeAt(0)
				if (container.contains(range.commonAncestorContainer)) selectRange(range)
			}, 600)
		}
		document.addEventListener("selectionchange", onChange)
		return () => {
			window.clearTimeout(timer)
			document.removeEventListener("selectionchange", onChange)
		}
	}, [selectRange])

	/** Öppnar panelen för en befintlig annotation, ifylld med dess (och ordets) uppgifter. */
	const startEditingAnnotation = useCallback(
		(annotation: ReadingAnnotation, anchor: HTMLElement) => {
			if (annotation.start_offset == null || annotation.end_offset == null) return
			const rect = anchor.getBoundingClientRect()
			const entry = annotation.lexical_entry
			const synonymList = entry?.inflection_data?.synonyms
			const modern = entry?.inflection_data?.modern_form
			rangeRef.current = anchor
			setPending({
				startOffset: annotation.start_offset,
				endOffset: annotation.end_offset,
				text: unit.content.slice(annotation.start_offset, annotation.end_offset),
				top: rect.top,
				bottom: rect.bottom,
				centerX: rect.left + rect.width / 2,
				annotation,
			})
			setKind(annotation.kind)
			setBody(annotation.kind === "definition" ? explanationOf(annotation) : annotation.body)
			setPartOfSpeech(entry?.part_of_speech ?? "")
			setModernForm(typeof modern === "string" ? modern : "")
			setSynonyms(Array.isArray(synonymList) ? synonymList.join(", ") : "")
			setGlossaryIds([])
			setSavedGlossaryIds([])
			setFormError(null)
			// Vilka av ens ordlistor ordet ligger i finns inte i läsvyns data; hämta ordet.
			if (entry) {
				getLexicalEntry(entry.id)
					.then(full => {
						setGlossaryIds(full.glossaries)
						setSavedGlossaryIds(full.glossaries)
					})
					.catch(() => {})
			}
		},
		[unit],
	)

	// Ens egna ordlistor, som en definition kan läggas i. Hämtas första gången panelen öppnas.
	useEffect(() => {
		if (!pending || ownGlossaries !== null || !user) return
		listGlossaries()
			.then(list => setOwnGlossaries(list.filter(glossary => glossary.owner === user.id)))
			.catch(() => setOwnGlossaries([]))
	}, [pending, ownGlossaries, user])

	useEffect(() => {
		if (!pending) return
		const handler = (e: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				setPending(null)
			}
		}
		document.addEventListener("mousedown", handler)
		return () => document.removeEventListener("mousedown", handler)
	}, [pending])

	useEffect(() => {
		if (!pending) return
		const reposition = () => {
			const rect = rangeRef.current?.getBoundingClientRect()
			if (!rect) return
			setPending(prev =>
				prev
					? { ...prev, top: rect.top, bottom: rect.bottom, centerX: rect.left + rect.width / 2 }
					: prev,
			)
		}
		window.addEventListener("scroll", reposition, true)
		window.addEventListener("resize", reposition)
		return () => {
			window.removeEventListener("scroll", reposition, true)
			window.removeEventListener("resize", reposition)
		}
	}, [pending !== null])

	useLayoutEffect(() => {
		if (!pending || !panelRef.current) return
		const margin = 12
		const { offsetWidth: width, offsetHeight: height } = panelRef.current
		const spaceBelow = window.innerHeight - pending.bottom
		const top =
			spaceBelow >= height + margin
				? pending.bottom + 8
				: Math.max(margin, pending.top - height - 8)
		const left = Math.min(
			Math.max(margin, pending.centerX - width / 2),
			window.innerWidth - width - margin,
		)
		setPlacement({ top, left })
	}, [pending])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!pending || !body.trim()) return
		setSubmitting(true)
		setFormError(null)
		const existing = pending.annotation
		try {
			let lexicalEntryId: Id | null = null
			if (kind === "definition") {
				// Ordets uppgifter, inklusive förklaringen, sparas på ordet så att ordlistor kan visa dem.
				const entryData = {
					part_of_speech: partOfSpeech.trim(),
					definition: body.trim(),
					inflection_data: {
						...(modernForm.trim() ? { modern_form: modernForm.trim() } : {}),
						...(synonyms.trim()
							? { synonyms: synonyms.split(",").map(s => s.trim()).filter(Boolean) }
							: {}),
					},
				}
				const entry = existing?.lexical_entry
					? await updateLexicalEntry(existing.lexical_entry.id, entryData)
					: await createLexicalEntry({ lemma: pending.text.trim(), language: "sv", ...entryData })
				lexicalEntryId = entry.id
				await setEntryGlossaries(entry.id, existing?.lexical_entry ? savedGlossaryIds : [], glossaryIds)
			}
			// En definitions förklaring ligger på ordet; annotationen bär bara förankringen i texten.
			const annotationBody = kind === "definition" ? "" : body.trim()
			if (existing) {
				await updateAnnotation(existing.id, { kind, body: annotationBody, lexical_entry: lexicalEntryId })
			} else {
				await createAnnotation({
					unit: unit.id,
					target_kind: /\s/.test(pending.text.trim()) ? "phrase" : "word",
					start_offset: pending.startOffset,
					end_offset: pending.endOffset,
					kind,
					body: annotationBody,
					lexical_entry: lexicalEntryId,
				})
			}
			setPending(null)
			window.getSelection()?.removeAllRanges()
			onAnnotated()
		} catch {
			setFormError(
				existing?.lexical_entry
					? "Kunde inte spara. Ordet kan tillhöra någon annan och då bara redigeras av den."
					: "Kunde inte spara.",
			)
		} finally {
			setSubmitting(false)
		}
	}

	async function handleDeleteEditing() {
		const existing = pending?.annotation
		if (!existing || !window.confirm("Ta bort annotationen? Det går inte att ångra.")) return
		setSubmitting(true)
		setFormError(null)
		try {
			await deleteAnnotation(existing.id)
			setPending(null)
			onAnnotated()
		} catch {
			setFormError("Annotationen kunde inte tas bort.")
		} finally {
			setSubmitting(false)
		}
	}

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
							pending && !pending.annotation ? { start: pending.startOffset, end: pending.endOffset } : null,
							startEditingAnnotation,
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
												onClick={event => startEditingAnnotation(annotation, event.currentTarget)}
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

			{pending && (
				<div
					ref={panelRef}
					className="fixed z-50"
					style={{
						top: placement.top,
						left: placement.left,
					}}>
					<form
						onSubmit={handleSubmit}
						className="bg-surface border border-border rounded-md w-96 max-w-[80vw]"
						onKeyDown={e => {
							if (e.key === "Escape") setPending(null)
						}}>
						<div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2 border-b border-border">
							<p className="font-body text-xs font-semibold text-text shrink-0">
								{pending.annotation ? "Redigera annotation" : "Ny annotation"}
							</p>
							<p className="font-display italic text-sm text-text-muted truncate">
								»{pending.text}»
							</p>
						</div>
						<div className="flex flex-col gap-2.5 px-4 py-3">
							<div className="flex flex-wrap gap-1.5">
								{ANNOTATION_KINDS.map(option => {
									const active = option.value === kind
									return (
										<button
											key={option.value}
											type="button"
											aria-pressed={active}
											onClick={() => setKind(option.value)}
											className={[
												"rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
												active
													? "border-primary bg-primary text-bg"
													: "border-text/30 text-text-muted hover:border-primary hover:text-primary",
											].join(" ")}>
											{option.label}
										</button>
									)
								})}
							</div>
							{kind === "definition" && (
								<>
									<div className="grid grid-cols-2 gap-2">
										<TextField
											label="Modernt"
											value={modernForm}
											onChange={e => setModernForm(e.target.value)}
											placeholder="Nutida form"
										/>
										<TextField
											label="Ordklass"
											value={partOfSpeech}
											onChange={e => setPartOfSpeech(e.target.value)}
											placeholder="verb, substantiv…"
										/>
									</div>
									<TextField
										label="Synonymer"
										value={synonyms}
										onChange={e => setSynonyms(e.target.value)}
										placeholder="Kommaseparerade"
									/>
								</>
							)}
							<TextAreaField
								label="Definition eller anteckning"
								value={body}
								onChange={e => setBody(e.target.value)}
								placeholder="Skriv en kort förklaring…"
								rows={2}
								required
								autoFocus
							/>
							{kind === "definition" && ownGlossaries && ownGlossaries.length > 0 && (
								<fieldset className="flex flex-col gap-1.5">
									<legend className="mb-1.5 font-body text-sm text-text">Ordlistor</legend>
									{ownGlossaries.map(glossary => (
										<CheckboxField
											key={glossary.id}
											label={glossary.title}
											checked={glossaryIds.includes(glossary.id)}
											onChange={event =>
												setGlossaryIds(current =>
													event.target.checked
														? [...current, glossary.id]
														: current.filter(id => id !== glossary.id),
												)
											}
										/>
									))}
								</fieldset>
							)}
							{formError && (
								<p role="alert" className="text-xs text-danger">
									{formError}
								</p>
							)}
							<div className="flex items-center justify-end gap-3">
								{pending.annotation && (
									<button
										type="button"
										disabled={submitting}
										onClick={handleDeleteEditing}
										className="mr-auto font-body text-sm text-text-muted underline underline-offset-4 hover:text-danger disabled:opacity-40 cursor-pointer">
										Ta bort
									</button>
								)}
								<button
									type="button"
									onClick={() => setPending(null)}
									className="font-body text-sm text-text-muted underline underline-offset-4 hover:text-text cursor-pointer">
									Avbryt
								</button>
								<button
									type="submit"
									disabled={submitting || !body.trim()}
									className="rounded-md px-3 py-1.5 font-body text-sm font-semibold bg-primary text-bg hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
									{submitting ? "Sparar…" : "Spara"}
								</button>
							</div>
						</div>
					</form>
				</div>
			)}
		</div>
	)
}
