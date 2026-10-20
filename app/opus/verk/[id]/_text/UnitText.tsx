"use client"
import { ReadingAnnotation, ReadingGloss, ReadingUnit } from "@/app/lib/dal/opus"
import React, { useState, useRef, useEffect, useCallback } from "react"
import { MoreHorizontalIcon } from "lucide-react"
import {
	combineUnits,
	deleteUnit,
	splitUnit,
	updateUnitContent,
	type UnitEditResult,
} from "../../../_actions/alignment-actions"
import { deleteAnnotation } from "../../../_actions/annotation-actions"
import { TextAreaField } from "../../../forms/Fields/Fields"
import Menu from "../_ui/Menu"
import WordPanel from "../_word-panel/WordPanel"
import type { Anchor } from "../_word-panel/usePanelPlacement"
import type { PanelTarget } from "../_word-panel/word-panel"
import { highlightContent } from "./highlight"
import SplitPicker from "./SplitPicker"
import { getTextOffset, trimToTokenBounds } from "./text-offsets"
import UnitAnnotations from "./UnitAnnotations"

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
			// Markeringen ritas om som ett eget element (se highlightContent) som ersätter webbläsarens blå
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
		setUnitError(null)
		setSplitMode(true)
	}

	function confirmSplit(at: number) {
		runUnitEdit(() => splitUnit(unit.id, at), () => setSplitMode(false))
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
						<SplitPicker
							content={unit.content}
							busy={unitBusy}
							onCancel={() => setSplitMode(false)}
							onConfirm={confirmSplit}
						/>
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
						<UnitAnnotations unit={unit} busy={unitBusy} onEdit={editAnnotation} onRemove={removeAnnotations} />
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
