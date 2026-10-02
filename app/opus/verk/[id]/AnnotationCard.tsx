"use client"

import { ReadingAnnotation } from "@/app/lib/dal/opus"
import { useState, useId } from "react"
import { ChevronLeftIcon, ChevronRightIcon, XIcon, ExpandIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { TextAreaField } from "../../forms/Fields/Fields"

type AnnotationEntry = {
	annotation: ReadingAnnotation
	editionTitle: string
	label: string | number
}

export default function AnnotationCard({
	annotations,
	highlighted = false,
	onDelete,
	onEdit,
}: {
	annotations: AnnotationEntry[]
	highlighted?: boolean
	/** Tar bort en not/fotnot. Utan den visas ingen radera-knapp. */
	onDelete?: (annotationId: number) => void
	/** Sparar notens nya text. Utan den visas ingen redigera-knapp. */
	onEdit?: (annotationId: number, body: string) => Promise<void>
}) {
	const [index, setIndex] = useState(0)
	const [draft, setDraft] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const id = useId()

	if (annotations.length === 0) return null

	// Efter en radering kan färre noter finnas kvar än det index vi stod på.
	const current = Math.min(index, annotations.length - 1)
	const entry = annotations[current]
	const remove = () => {
		if (onDelete && window.confirm("Ta bort noten? Det går inte att ångra.")) onDelete(entry.annotation.id)
	}
	const body =
		entry.annotation.body ||
		entry.annotation.lexical_entry?.lemma ||
		entry.annotation.kind
	const save = async () => {
		if (!onEdit || draft === null || !draft.trim()) return
		setSaving(true)
		try {
			await onEdit(entry.annotation.id, draft.trim())
			setDraft(null)
		} finally {
			setSaving(false)
		}
	}

	const isActive = highlighted || (index === annotations.length - 1 && annotations.length > 1)

	return (
		<>
			<div
				className={[
					"rounded-sm px-4 py-3 text-sm",
					isActive
						? "bg-foreground text-bg"
						: "bg-surface text-text border border-border",
				].join(" ")}>
				<div className={"flex items-start justify-between gap-2 mb-1"}>
					<p
						className={[
							"font-mono text-xs tracking-widest uppercase",
							isActive ? "text-bg/60" : "text-text/60",
						].join(" ")}>
						Rad {entry.label} · {entry.editionTitle}
					</p>
					<div className={"flex shrink-0 items-center gap-2 mt-0.5"}>
						<button
							type="button"
							popoverTarget={id}
							aria-label="Visa hela noten"
							className={isActive ? "text-bg/70 hover:text-bg" : "text-text/60 hover:text-text"}>
							<ExpandIcon size={12} />
						</button>
						{onEdit && (
							<button
								type="button"
								onClick={() => setDraft(entry.annotation.body)}
								title="Redigera noten"
								aria-label="Redigera noten"
								className={isActive ? "text-bg/70 hover:text-bg" : "text-text/60 hover:text-text"}>
								<PencilIcon size={12} />
							</button>
						)}
						{onDelete && (
							<button
								type="button"
								onClick={remove}
								title="Ta bort noten"
								aria-label="Ta bort noten"
								className={isActive ? "text-bg/70 hover:text-bg" : "text-text/60 hover:text-text"}>
								<Trash2Icon size={12} />
							</button>
						)}
					</div>
				</div>
				{draft !== null ? (
					<div className={"flex flex-col gap-2"}>
						<TextAreaField
							label={"Not"}
							value={draft}
							onChange={event => setDraft(event.target.value)}
							onKeyDown={event => {
								if (event.key === "Escape") setDraft(null)
							}}
							rows={3}
							autoFocus
						/>
						<div className={"flex items-center justify-end gap-3"}>
							<button
								type="button"
								onClick={() => setDraft(null)}
								className={"underline underline-offset-4 opacity-70 hover:opacity-100 cursor-pointer"}>
								Avbryt
							</button>
							<button
								type="button"
								disabled={saving || !draft.trim()}
								onClick={save}
								className={"rounded-md px-3 py-1 font-semibold bg-primary text-bg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"}>
								{saving ? "Sparar…" : "Spara"}
							</button>
						</div>
					</div>
				) : (
					<p className={"line-clamp-3"}>{body}</p>
				)}
				{annotations.length > 1 && (
					<div className={"mt-2 flex items-center gap-1"}>
						<button
							type="button"
							onClick={() => {
								setDraft(null)
								setIndex(i => Math.max(0, i - 1))
							}}
							disabled={index === 0}
							className={"disabled:opacity-30 hover:opacity-70"}>
							<ChevronLeftIcon size={14} />
						</button>
						<span className={"font-mono text-xs"}>
							{index + 1}/{annotations.length}
						</span>
						<button
							type="button"
							onClick={() => {
								setDraft(null)
								setIndex(i => Math.min(annotations.length - 1, i + 1))
							}}
							disabled={index === annotations.length - 1}
							className={"disabled:opacity-30 hover:opacity-70"}>
							<ChevronRightIcon size={14} />
						</button>
					</div>
				)}
			</div>

			<div popover="auto" id={id} className={"annotation-popup"}>
				<div className={"rounded-lg px-6 py-5 text-sm shadow-xl bg-surface text-text border border-border"}>
					<div className={"flex items-start justify-between mb-3"}>
						<p className={"font-mono text-xs tracking-widest uppercase text-text/60"}>
							Rad {entry.label} · {entry.editionTitle}
						</p>
						<button type="button" popoverTarget={id} popoverTargetAction="hide" className={"ml-4 text-text/40 hover:text-text shrink-0"}>
							<XIcon size={14} />
						</button>
					</div>
					<p className={"leading-relaxed font-display"}>{body}</p>
				</div>
			</div>
		</>
	)
}
