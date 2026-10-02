"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ChevronRightIcon, EllipsisIcon, GripVerticalIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Chip } from "@/app/components/ui/Chip"
import { Drawer, useDrawerClose } from "@/app/components/ui/Drawer"
import { EditionReadingStatus, type ImportOptions } from "@/app/lib/dal/opus"
import { addEmptyChapter, deleteEdition, reorderEditionChapters } from "../../_actions/editions"
import { requestUnitNavigation } from "../../_state/unit-navigation"
import { FileField, SelectField, TextField } from "../../forms/Fields/Fields"
import ImportPreview, { appendEditionFile, DEFAULT_IMPORT_OPTIONS, importEditionFile } from "../../forms/ImportPreview"
import Menu from "./Menu"

const BAR_CLASS: Record<string, string> = {
	primary: "bg-primary",
	secondary: "bg-secondary",
	accent: "bg-accent",
	foreground: "bg-foreground",
}

type Chapter = EditionReadingStatus["chapters"][number]

/**
 * Utgåvans kapitel. Klick hoppar till kapitlet i läsaren; dra ett kapitel (i greppet till
 * vänster) till en ny plats för att ordna om, så följer dess text med.
 */
function ChapterList({ workId, editionId, chapters }: { workId: number; editionId: number; chapters: Chapter[] }) {
	const router = useRouter()
	const closeDrawer = useDrawerClose()
	const [order, setOrder] = useState(chapters)
	const [dragId, setDragId] = useState<number | null>(null)
	// Platsen dit kapitlet skulle hamna: före kapitlet med det indexet (order.length = sist).
	const [dropIndex, setDropIndex] = useState<number | null>(null)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	if (order.length === 0) {
		return <p className='text-sm text-text-muted'>Inga kapitel hittades i den här utgåvan.</p>
	}

	function endDrag() {
		setDragId(null)
		setDropIndex(null)
	}

	async function drop() {
		const from = order.findIndex(chapter => chapter.id === dragId)
		let to = dropIndex ?? from
		endDrag()
		if (from < 0) return
		if (to > from) to -= 1
		if (to === from) return
		const previous = order
		const next = [...order]
		next.splice(to, 0, ...next.splice(from, 1))
		setOrder(next)
		setSaving(true)
		setError(null)
		const result = await reorderEditionChapters(workId, editionId, next.map(chapter => chapter.id))
		setSaving(false)
		if (result.error) {
			setOrder(previous)
			setError(result.error)
			return
		}
		router.refresh()
	}

	return (
		<>
			<p className='mb-2 text-xs text-text-muted'>
				{saving ? "Sparar ny ordning…" : "Dra i greppet för att ordna om kapitlen."}
			</p>
			{error && (
				<p role={"alert"} className={"mb-2 text-sm text-danger"}>
					{error}
				</p>
			)}
			<ol className='flex flex-col' onDragLeave={event => event.currentTarget === event.target && setDropIndex(null)}>
				{order.map((chapter, index) => (
					<li
						key={chapter.id}
						draggable={!saving}
						onDragStart={event => {
							setDragId(chapter.id)
							event.dataTransfer.effectAllowed = "move"
							event.dataTransfer.setData("text/plain", String(chapter.id))
						}}
						onDragOver={event => {
							if (dragId === null) return
							event.preventDefault()
							const box = event.currentTarget.getBoundingClientRect()
							setDropIndex(event.clientY > box.top + box.height / 2 ? index + 1 : index)
						}}
						onDrop={event => {
							event.preventDefault()
							void drop()
						}}
						onDragEnd={endDrag}
						className={`border-t-2 ${dropIndex === index ? "border-primary" : "border-transparent"} ${
							index === order.length - 1 && dropIndex === order.length ? "border-b-2 border-b-primary" : ""
						} ${dragId === chapter.id ? "opacity-40" : ""}`}>
						<div className='group flex items-center gap-2 border-b border-border'>
							<span
								aria-hidden
								className='cursor-grab py-2.5 text-text-muted opacity-40 transition-opacity group-hover:opacity-100 active:cursor-grabbing'>
								<GripVerticalIcon size={14} />
							</span>
							<button
								type='button'
								onClick={() => {
									requestUnitNavigation(chapter.id)
									closeDrawer()
								}}
								className='flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left hover:bg-text/5 cursor-pointer'>
								<span className='w-6 shrink-0 text-right font-mono text-xs text-text-muted'>{index + 1}</span>
								<span className='min-w-0 flex-1 truncate font-body text-sm text-text'>{chapter.label}</span>
								<ChevronRightIcon
									size={14}
									className='shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100'
								/>
							</button>
						</div>
					</li>
				))}
			</ol>
		</>
	)
}

/** Var nya kapitel hamnar: sist, eller före ett av de befintliga kapitlen. */
function PlacementField({
	chapters,
	value,
	onChange,
}: {
	chapters: Chapter[]
	value: number | null
	onChange: (before: number | null) => void
}) {
	return (
		<SelectField
			label={"Placering"}
			value={value === null ? "" : String(value)}
			onChange={event => onChange(event.target.value ? Number(event.target.value) : null)}>
			<option value={""}>Sist</option>
			{chapters.map(chapter => (
				<option key={chapter.id} value={chapter.id}>
					Före {chapter.label}
				</option>
			))}
		</SelectField>
	)
}

/** Ett namngivet kapitel utan text: platshållare för ett kapitel utgåvan saknar. */
function EmptyChapterForm({
	workId,
	editionId,
	chapters,
	onCancel,
}: {
	workId: number
	editionId: number
	chapters: Chapter[]
	onCancel: () => void
}) {
	const router = useRouter()
	const [label, setLabel] = useState("")
	const [before, setBefore] = useState<number | null>(chapters[0]?.id ?? null)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!label.trim() || pending) return
		setPending(true)
		setError(null)
		const result = await addEmptyChapter(workId, editionId, label.trim(), before)
		setPending(false)
		if (result.error) {
			setError(result.error)
			return
		}
		router.refresh()
		onCancel()
	}

	return (
		<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
			<p className='text-sm text-text-muted'>
				Ett kapitel utan text håller platsen för ett kapitel som saknas i den här utgåvan. Det syns i indexet och
				som rubrik i läsaren.
			</p>
			<TextField
				label={"Kapitlets namn"}
				value={label}
				onChange={event => setLabel(event.target.value)}
				placeholder={"Till exempel: Kapitel 1"}
				required
			/>
			<PlacementField chapters={chapters} value={before} onChange={setBefore} />
			{error && (
				<p role={"alert"} className={"text-sm text-danger"}>
					{error}
				</p>
			)}
			<div className={"flex justify-end gap-3"}>
				<Button type={"button"} variant={"ghost"} onClick={onCancel}>
					Avbryt
				</Button>
				<Button type={"submit"} disabled={!label.trim() || pending}>
					{pending ? "Lägger till…" : "Lägg till"}
				</Button>
			</div>
		</form>
	)
}

/**
 * Importerar en fil till utgåvan: som dess första text ("import", för en tom utgåva) eller
 * efter den text som redan finns ("append", t.ex. ett kapitel till).
 */
function ImportFile({
	editionId,
	mode,
	chapters = [],
	onCancel,
}: {
	editionId: number
	mode: "import" | "append"
	/** Utgåvans kapitel, för att välja var de nya kapitlen hamnar ("append"). */
	chapters?: Chapter[]
	onCancel?: () => void
}) {
	const router = useRouter()
	const closeDrawer = useDrawerClose()
	const [file, setFile] = useState<File | null>(null)
	const [options, setOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS)
	const [before, setBefore] = useState<number | null>(null)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const appending = mode === "append"

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!file || pending) return
		setPending(true)
		setError(null)
		try {
			if (appending) await appendEditionFile(editionId, file, options, before)
			else await importEditionFile(editionId, file, options)
			router.refresh()
			closeDrawer()
		} catch (importError) {
			setError(importError instanceof Error ? importError.message : "Filen kunde inte importeras.")
		} finally {
			setPending(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className='flex flex-col gap-4'>
			<p className='text-sm text-text-muted'>
				{appending
					? "Filens kapitel läggs in där du väljer: sist, eller före ett av de befintliga kapitlen."
					: "Utgåvan har ingen text ännu."}
			</p>
			<FileField
				label={appending ? "Fil med kapitlet" : "Fil att importera"}
				accept={".txt,.md,.html,.htm,.pdf,.epub,.docx"}
				onFilesChange={files => setFile(files[0] ?? null)}
			/>
			{appending && chapters.length > 0 && <PlacementField chapters={chapters} value={before} onChange={setBefore} />}
			{file && <ImportPreview file={file} options={options} onOptionsChange={setOptions} />}
			{error && (
				<p role={"alert"} className={"text-sm text-danger"}>
					{error}
				</p>
			)}
			<div className={"flex justify-end gap-3"}>
				{onCancel && (
					<Button type={"button"} variant={"ghost"} onClick={onCancel}>
						Avbryt
					</Button>
				)}
				<Button type={"submit"} disabled={!file || pending}>
					{pending ? "Importerar…" : appending ? "Lägg till" : "Importera"}
				</Button>
			</div>
		</form>
	)
}

/** Innehållet i en utgåvas drawer: kapitellistan (eller import) och en liten meny för sällsynta val. */
function EditionPanel({
	workId,
	edition,
	color,
	hasText,
}: {
	workId: number
	edition: EditionReadingStatus
	color: string
	hasText: boolean
}) {
	const router = useRouter()
	const closeDrawer = useDrawerClose()
	// Vad panelen visar: kapitellistan, formuläret för ett kapitel till, eller ett tomt kapitel.
	const [mode, setMode] = useState<"list" | "append" | "empty">("list")
	const [deleting, setDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function removeEdition() {
		if (!window.confirm(`Radera utgåvan "${edition.title}"? All dess text, noter och synkning tas bort.`)) return
		setDeleting(true)
		setError(null)
		const result = await deleteEdition(workId, edition.id)
		setDeleting(false)
		if (result.error) {
			setError(result.error)
			return
		}
		router.refresh()
		closeDrawer()
	}

	return (
		<>
			<div className='mb-3 flex items-center gap-2'>
				<span className={`h-2 w-2 shrink-0 rounded-full ${BAR_CLASS[color] ?? BAR_CLASS.foreground}`} />
				<p className='font-mono text-xs uppercase tracking-widest text-text-muted'>
					{hasText ? `${edition.chapters.length} kapitel` : "Ingen text"}
				</p>
				<div className='ml-auto'>
					<Menu
						ariaLabel={"Fler val för utgåvan"}
						disabled={deleting}
						triggerClassName={"rounded px-1.5 py-0.5 text-text-muted hover:bg-text/10 hover:text-text cursor-pointer"}
						trigger={<EllipsisIcon size={16} aria-hidden />}
						items={[
							...(hasText
								? [
										{ label: "Lägg till kapitel…", onSelect: () => setMode("append") },
										{
											label: "Lägg till tomt kapitel…",
											hint: "Håller platsen för ett kapitel som saknas i utgåvan",
											onSelect: () => setMode("empty"),
										},
										"separator" as const,
									]
								: []),
							{ label: "Radera utgåvan", danger: true, onSelect: removeEdition },
						]}
					/>
				</div>
			</div>
			{error && (
				<p role={"alert"} className={"mb-3 text-sm text-danger"}>
					{error}
				</p>
			)}
			{!hasText ? (
				<ImportFile editionId={edition.id} mode={"import"} />
			) : mode === "append" ? (
				<ImportFile
					editionId={edition.id}
					mode={"append"}
					chapters={edition.chapters}
					onCancel={() => setMode("list")}
				/>
			) : mode === "empty" ? (
				<EmptyChapterForm
					workId={workId}
					editionId={edition.id}
					chapters={edition.chapters}
					onCancel={() => setMode("list")}
				/>
			) : (
				// Nyckeln nollställer listans lokala ordning när servern skickar nya kapitel.
				<ChapterList
					key={edition.chapters.map(chapter => chapter.id).join(",")}
					workId={workId}
					editionId={edition.id}
					chapters={edition.chapters}
				/>
			)}
		</>
	)
}

export default function ({
	workId,
	edition,
	color,
	hasText,
}: {
	workId: number
	edition: EditionReadingStatus
	color: string
	/** Om utgåvan redan har importerad text; annars erbjuds import i stället för kapitellistan. */
	hasText: boolean
}) {
	return (
		<Drawer
			triggerVariant={"unstyled"}
			triggerClassName={"cursor-pointer"}
			title={edition.title}
			trigger={
				<Chip
					key={edition.id}
					variant={"neutral-active"}
					className={"border-border rounded-sm text-sm"}>
					<svg width={10} height={10} viewBox={"0 0 15 15"}>
						<circle cx='5' cy={7} r={5} fill={`var(--${color})`} />
					</svg>
					{edition.title}
				</Chip>
			}>
			<EditionPanel workId={workId} edition={edition} color={color} hasText={hasText} />
		</Drawer>
	)
}
