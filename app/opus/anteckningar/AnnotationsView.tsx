"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { BookOpenIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import type { Annotation, AnnotationKind, Id } from "@/app/lib/dal/opus"
import { useUser } from "@/app/lib/user-context"
import { deleteAnnotation, updateAnnotation } from "../_actions/annotation-actions"
import { updateLexicalEntry } from "../_actions/lexical-entry-actions"
import { SelectField, TextAreaField, TextField } from "../forms/Fields/Fields"
import Divider from "../ui/Divider"

/** Synlig fokusmarkering för tangentbordsnavigering, samma som Opus formulärfält. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

const ICON_BUTTON = `grid size-7 place-items-center rounded-md text-text-muted transition-colors hover:bg-foreground/5 hover:text-text disabled:opacity-40 cursor-pointer ${FOCUS}`

const KIND_LABELS: Record<string, string> = {
	definition: "Definition",
	note: "Anteckning",
	reference: "Hänvisning",
}

const FILTERS: { value: AnnotationKind | null; label: string }[] = [
	{ value: null, label: "Alla" },
	{ value: "definition", label: "Definitioner" },
	{ value: "note", label: "Anteckningar" },
	{ value: "reference", label: "Hänvisningar" },
]

type SortOrder = "text" | "updated" | "alphabetical"

const SORTS: { value: SortOrder; label: string }[] = [
	{ value: "text", label: "Ordning i texten" },
	{ value: "updated", label: "Senast ändrad" },
	{ value: "alphabetical", label: "Alfabetiskt" },
]

/** Sorterar inom ett verk. API:t levererar redan textens ordning (stycke, position). */
function sortAnnotations(annotations: Annotation[], order: SortOrder) {
	if (order === "updated") return [...annotations].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
	if (order === "alphabetical") {
		const key = (annotation: Annotation) => annotation.target_text || annotation.excerpt
		return [...annotations].sort((a, b) => key(a).localeCompare(key(b), "sv"))
	}
	return annotations
}

function modernFormOf(annotation: Annotation) {
	const value = annotation.entry?.inflection_data?.modern_form
	return typeof value === "string" ? value : ""
}

function synonymsOf(annotation: Annotation) {
	const value = annotation.entry?.inflection_data?.synonyms
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

/** Definitionens förklaring ligger på ordet; äldre definitioner har den i annotationens text. */
function explanationOf(annotation: Annotation) {
	return annotation.kind === "definition" ? annotation.entry?.definition || annotation.body : annotation.body
}

/** Läsvyn öppnad vid annotationens stycke (se `enhet` i app/opus/verk/[id]/page.tsx). */
function readingHref(annotation: Annotation) {
	return `/verk/${annotation.work.id}?enhet=${annotation.unit}`
}

function matches(annotation: Annotation, query: string) {
	const haystack = [
		annotation.target_text,
		explanationOf(annotation),
		modernFormOf(annotation),
		...synonymsOf(annotation),
		annotation.work.title,
		annotation.edition_title,
		annotation.chapter?.label ?? "",
	]
		.join(" ")
		.toLocaleLowerCase("sv")
	return haystack.includes(query.toLocaleLowerCase("sv"))
}

function EditForm({
	annotation,
	onSaved,
	onCancel,
}: {
	annotation: Annotation
	onSaved: (annotation: Annotation) => void
	onCancel: () => void
}) {
	const isDefinition = annotation.kind === "definition" && annotation.entry !== null
	const [text, setText] = useState(explanationOf(annotation))
	const [modernForm, setModernForm] = useState(modernFormOf(annotation))
	const [partOfSpeech, setPartOfSpeech] = useState(annotation.entry?.part_of_speech ?? "")
	const [synonyms, setSynonyms] = useState(synonymsOf(annotation).join(", "))
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!text.trim()) return
		setPending(true)
		setError(null)
		try {
			if (isDefinition && annotation.entry) {
				const entry = await updateLexicalEntry(annotation.entry.id, {
					part_of_speech: partOfSpeech.trim(),
					definition: text.trim(),
					inflection_data: {
						...annotation.entry.inflection_data,
						modern_form: modernForm.trim() || undefined,
						synonyms: synonyms.trim() ? synonyms.split(",").map(s => s.trim()).filter(Boolean) : undefined,
					},
				})
				// Äldre definitioner har förklaringen i annotationen; den flyttas till ordet.
				const saved = annotation.body ? await updateAnnotation(annotation.id, { body: "" }) : annotation
				onSaved({ ...saved, entry: { ...entry } })
			} else {
				onSaved(await updateAnnotation(annotation.id, { body: text.trim() }))
			}
		} catch {
			setError(isDefinition ? "Kunde inte spara. Ordet kan tillhöra någon annan." : "Kunde inte spara.")
		} finally {
			setPending(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className='flex max-w-2xl flex-col gap-3 py-3'>
			{isDefinition && (
				<div className='grid gap-3 sm:grid-cols-3'>
					<TextField
						label='Modernt'
						value={modernForm}
						onChange={event => setModernForm(event.target.value)}
						placeholder='Nutida form'
					/>
					<TextField
						label='Ordklass'
						value={partOfSpeech}
						onChange={event => setPartOfSpeech(event.target.value)}
						maxLength={100}
						placeholder='verb, substantiv…'
					/>
					<TextField
						label='Synonymer'
						value={synonyms}
						onChange={event => setSynonyms(event.target.value)}
						placeholder='Kommaseparerade'
					/>
				</div>
			)}
			<TextAreaField
				label={isDefinition ? "Definition" : "Anteckning"}
				value={text}
				onChange={event => setText(event.target.value)}
				rows={2}
				required
				autoFocus
			/>
			{error && (
				<p role='alert' className='text-sm text-danger'>
					{error}
				</p>
			)}
			<div className='flex justify-end gap-3'>
				<Button type='button' variant='ghost' onClick={onCancel}>
					Avbryt
				</Button>
				<Button type='submit' disabled={pending || !text.trim()}>
					{pending ? "Sparar…" : "Spara"}
				</Button>
			</div>
		</form>
	)
}

/** En rad: ordet till vänster, förklaringen i mitten, åtgärderna till höger. */
function AnnotationRow({
	annotation,
	canEdit,
	onChanged,
	onRemoved,
}: {
	annotation: Annotation
	canEdit: boolean
	onChanged: (annotation: Annotation) => void
	onRemoved: (id: Id) => void
}) {
	const [editing, setEditing] = useState(false)
	const [removing, setRemoving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const explanation = explanationOf(annotation)
	const modernForm = modernFormOf(annotation)
	const meta = [KIND_LABELS[annotation.kind] ?? annotation.kind, annotation.entry?.part_of_speech].filter(Boolean)

	async function handleRemove() {
		if (!window.confirm("Ta bort annotationen? Det går inte att ångra.")) return
		setRemoving(true)
		setError(null)
		try {
			await deleteAnnotation(annotation.id)
			onRemoved(annotation.id)
		} catch {
			setError("Annotationen kunde inte tas bort.")
			setRemoving(false)
		}
	}

	return (
		<li className='group border-b border-border'>
			<div className='grid gap-x-6 gap-y-1 py-2.5 sm:grid-cols-[13rem_minmax(0,1fr)_auto] sm:items-baseline'>
				<div className='min-w-0'>
					<p className='truncate font-display text-lg font-semibold text-text'>
						{annotation.target_text || <span className='font-normal italic text-text-muted'>Hela stycket</span>}
					</p>
					<p className='truncate text-xs text-text-muted'>{meta.join(" · ")}</p>
				</div>
				<p className='line-clamp-2 min-w-0 text-text'>
					{modernForm && <span className='text-text-muted'>{modernForm} – </span>}
					{explanation || <span className='italic text-text-muted'>Ingen text</span>}
				</p>
				<div className='flex items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'>
					<Link href={readingHref(annotation)} title='Visa i texten' aria-label='Visa i texten' className={ICON_BUTTON}>
						<BookOpenIcon size={14} />
					</Link>
					{canEdit && (
						<button
							type='button'
							onClick={() => setEditing(open => !open)}
							title='Redigera'
							aria-label='Redigera'
							aria-expanded={editing}
							className={ICON_BUTTON}>
							<PencilIcon size={14} />
						</button>
					)}
					<button
						type='button'
						disabled={removing}
						onClick={handleRemove}
						title='Ta bort'
						aria-label='Ta bort'
						className={`${ICON_BUTTON} hover:text-danger`}>
						<Trash2Icon size={14} />
					</button>
				</div>
			</div>
			{editing && (
				<EditForm
					annotation={annotation}
					onSaved={saved => {
						onChanged(saved)
						setEditing(false)
					}}
					onCancel={() => setEditing(false)}
				/>
			)}
			{error && (
				<p role='alert' className='pb-2 text-sm text-danger'>
					{error}
				</p>
			)}
		</li>
	)
}

/** Alla användarens anteckningar, hänvisningar och definitioner som en kompakt lista per verk. */
export default function AnnotationsView({ annotations }: { annotations: Annotation[] }) {
	const user = useUser()
	const [items, setItems] = useState(annotations)
	const [kind, setKind] = useState<AnnotationKind | null>(null)
	const [workId, setWorkId] = useState<Id | null>(null)
	const [order, setOrder] = useState<SortOrder>("text")
	const [query, setQuery] = useState("")

	const works = useMemo(() => {
		const byId = new Map<Id, string>()
		for (const annotation of items) byId.set(annotation.work.id, annotation.work.title)
		return [...byId.entries()]
			.map(([id, title]) => ({ id, title }))
			.sort((a, b) => a.title.localeCompare(b.title, "sv"))
	}, [items])

	// Antalen per typ följer valt verk, så att filtren visar vad som faktiskt finns att se.
	const counts = useMemo(() => {
		const byKind = new Map<string, number>()
		for (const annotation of items) {
			if (workId !== null && annotation.work.id !== workId) continue
			byKind.set(annotation.kind, (byKind.get(annotation.kind) ?? 0) + 1)
		}
		return byKind
	}, [items, workId])
	const total = [...counts.values()].reduce((sum, count) => sum + count, 0)

	const groups = useMemo(() => {
		const trimmed = query.trim()
		const byWork = new Map<Id, { title: string; annotations: Annotation[] }>()
		for (const annotation of items) {
			if (workId !== null && annotation.work.id !== workId) continue
			if (kind && annotation.kind !== kind) continue
			if (trimmed && !matches(annotation, trimmed)) continue
			const group = byWork.get(annotation.work.id) ?? { title: annotation.work.title, annotations: [] }
			group.annotations.push(annotation)
			byWork.set(annotation.work.id, group)
		}
		return [...byWork.entries()]
			.map(([id, group]) => ({ workId: id, title: group.title, annotations: sortAnnotations(group.annotations, order) }))
			.sort((a, b) => a.title.localeCompare(b.title, "sv"))
	}, [items, workId, kind, order, query])

	const shown = groups.reduce((sum, group) => sum + group.annotations.length, 0)
	const filtered = kind !== null || workId !== null || query.trim() !== ""

	return (
		<>
			<section className='flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
				<h1 className='font-display text-3xl font-bold text-text'>Anteckningar</h1>
				{items.length > 0 && (
					<div className='grid gap-3 sm:grid-cols-3 md:w-3xl'>
						<SelectField
							label='Verk'
							hideLabel
							value={workId ?? ""}
							onChange={event => setWorkId(event.target.value ? Number(event.target.value) : null)}>
							<option value=''>Alla verk</option>
							{works.map(work => (
								<option key={work.id} value={work.id}>
									{work.title}
								</option>
							))}
						</SelectField>
						<SelectField
							label='Sortering'
							hideLabel
							value={order}
							onChange={event => setOrder(event.target.value as SortOrder)}>
							{SORTS.map(sort => (
								<option key={sort.value} value={sort.value}>
									{sort.label}
								</option>
							))}
						</SelectField>
						<TextField
							label='Sök bland anteckningar'
							hideLabel
							type='search'
							value={query}
							onChange={event => setQuery(event.target.value)}
							placeholder='Sök på ord eller text'
						/>
					</div>
				)}
			</section>
			{items.length > 0 && (
				<div className='mt-4 flex flex-wrap gap-1.5' role='group' aria-label='Visa typ'>
					{FILTERS.map(option => {
						const active = option.value === kind
						const count = option.value ? counts.get(option.value) ?? 0 : total
						if (option.value && count === 0 && !active) return null
						return (
							<button
								key={option.label}
								type='button'
								aria-pressed={active}
								onClick={() => setKind(option.value)}
								className={[
									"rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
									FOCUS,
									active
										? "border-primary bg-primary text-bg"
										: "border-text/30 text-text-muted hover:border-primary hover:text-primary",
								].join(" ")}>
								{option.label} <span className='oldstyle-nums opacity-70'>{count}</span>
							</button>
						)
					})}
				</div>
			)}
			<Divider>
				<span className='font-display italic oldstyle-nums'>
					{items.length === 0
						? "Inga anteckningar"
						: filtered
							? `${shown} av ${items.length}`
							: `${items.length} i ${groups.length} verk`}
				</span>
			</Divider>

			{items.length === 0 ? (
				<p className='my-10 text-center font-display text-lg text-text-muted'>
					Inga anteckningar än. Öppna en bok och markera ett ord eller en fras.{" "}
					<Link href='/' className={`rounded-sm text-primary underline underline-offset-4 hover:text-text ${FOCUS}`}>
						Till bokhyllan
					</Link>
				</p>
			) : shown === 0 ? (
				<p className='my-10 text-center font-display text-lg italic text-text-muted'>Inget matchar.</p>
			) : (
				<div className='my-6 flex flex-col gap-8'>
					{groups.map(group => (
						<section key={group.workId} aria-labelledby={`work-${group.workId}`}>
							<div className='flex items-baseline justify-between gap-4 border-b border-text/40 pb-1'>
								<h2 id={`work-${group.workId}`} className='font-display text-xl font-semibold text-text'>
									{group.title}{" "}
									<span className='font-normal text-text-muted oldstyle-nums'>{group.annotations.length}</span>
								</h2>
								<Link
									href={`/verk/${group.workId}`}
									className={`shrink-0 rounded-sm text-sm text-text-muted underline underline-offset-4 hover:text-text ${FOCUS}`}>
									Öppna verket
								</Link>
							</div>
							<ul>
								{group.annotations.map(annotation => (
									<AnnotationRow
										key={annotation.id}
										annotation={annotation}
										canEdit={
											annotation.kind !== "definition" ||
											annotation.entry === null ||
											annotation.entry.owner === null ||
											annotation.entry.owner === user?.id
										}
										onChanged={saved =>
											setItems(current => current.map(item => (item.id === saved.id ? saved : item)))
										}
										onRemoved={id => setItems(current => current.filter(item => item.id !== id))}
									/>
								))}
							</ul>
						</section>
					))}
				</div>
			)}
		</>
	)
}
