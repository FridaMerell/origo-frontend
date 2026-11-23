"use client"

import { useState, type FormEvent, type ReactNode } from "react"
import type { AnnotationKind, Id } from "@/app/lib/dal/opus"
import { useConfirmDialog } from "@/app/components/ui/useConfirmDialog"
import { Button } from "@/app/components/ui/Button"
import { useDismissableOpen } from "@/app/components/ui/use-dismissable-open"
import { deleteAnnotation } from "../../../_actions/annotation-actions"
import { deleteLexicalEntry } from "../../../_actions/lexical-entry-actions"
import { deleteLexicalForm } from "../../../_actions/lexical-form-actions"
import { useReadingGlossaries } from "../../../_state/opus-context"
import GrammarFields from "../../../ordlistor/GrammarFields"
import { BodyField, FormOfStep, FormStep, ListsStep, MeaningStep, type Update } from "./steps"
import { usePanelPlacement, type Anchor } from "./usePanelPlacement"
import { canSave, initialDraft, saveWord, savesForm, type PanelTarget } from "./word-panel"

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
	const { requestConfirm, dialog } = useConfirmDialog()
	// The panel closes on Escape or a press outside it, but not while its confirmation (portaled
	// outside the panel) is open.
	const { ref: panelRef } = useDismissableOpen<HTMLDivElement>({ open: dialog === null, onDismiss: onClose })
	const placement = usePanelPlacement(anchor, panelRef, TALLEST_PANEL)

	const update: Update = patch => setDraft(current => ({ ...current, ...patch }))

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

	function confirmAndRun(title: string, message: string, action: () => Promise<unknown>, failure: string) {
		requestConfirm({ title, message, confirmLabel: "Ta bort", destructive: true, onConfirm: () => run(action, failure) })
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
			{dialog}
			<form
				onSubmit={handleSubmit}
				// Samma ram som Opus dialoger: rubrik i rubriktypsnittet, skugga, linje över knapparna.
				className='flex max-h-[85vh] w-96 max-w-[80vw] flex-col overflow-hidden rounded-lg border border-border bg-surface text-text shadow-xl'
				style={placement?.maxHeight ? { maxHeight: placement.maxHeight } : undefined}>
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
									"Ta bort annotationen?",
									"Det går inte att ångra.",
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
										`Ta bort ordet ${gloss.lexical_entry.lemma}?`,
										"Det försvinner ur alla texter och ordlistor, tillsammans med definitionerna som pekar på det, och går inte att ångra.",
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
											"Ta bort formen?",
											`»${target.text}» tas bort som form av ${gloss.lexical_entry.lemma}.`,
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
					<Button type='submit' size='sm' rounded='rounded-md' disabled={busy || !canSave(draft, target)}>
						{busy ? "Sparar…" : "Spara"}
					</Button>
				</div>
			</form>
		</div>
	)
}
