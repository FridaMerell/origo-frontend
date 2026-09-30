"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ChevronRightIcon, EllipsisIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import { Chip } from "@/app/components/ui/Chip"
import { Drawer, useDrawerClose } from "@/app/components/ui/Drawer"
import { EditionReadingStatus, type ImportOptions } from "@/app/lib/dal/opus"
import { deleteEdition } from "../../_actions/editions"
import { requestUnitNavigation } from "../../_state/unit-navigation"
import { FileField } from "../../forms/Fields/Fields"
import ImportPreview, { appendEditionFile, DEFAULT_IMPORT_OPTIONS, importEditionFile } from "../../forms/ImportPreview"
import Menu from "./Menu"

const BAR_CLASS: Record<string, string> = {
	primary: "bg-primary",
	secondary: "bg-secondary",
	accent: "bg-accent",
	foreground: "bg-foreground",
}

function ChapterList({ chapters }: { chapters: EditionReadingStatus["chapters"] }) {
	const closeDrawer = useDrawerClose()

	if (chapters.length === 0) {
		return <p className='text-sm text-text-muted'>Inga kapitel hittades i den här utgåvan.</p>
	}

	return (
		<ol className='flex flex-col divide-y divide-border'>
			{chapters.map((chapter, index) => (
				<li key={chapter.id}>
					<button
						type='button'
						onClick={() => {
							requestUnitNavigation(chapter.id)
							closeDrawer()
						}}
						className='group flex w-full items-center gap-3 py-2.5 text-left hover:bg-text/5 cursor-pointer'>
						<span className='w-6 shrink-0 text-right font-mono text-xs text-text-muted'>{index + 1}</span>
						<span className='min-w-0 flex-1 truncate font-body text-sm text-text'>{chapter.label}</span>
						<ChevronRightIcon
							size={14}
							className='shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100'
						/>
					</button>
				</li>
			))}
		</ol>
	)
}

/**
 * Importerar en fil till utgåvan: som dess första text ("import", för en tom utgåva) eller
 * efter den text som redan finns ("append", t.ex. ett kapitel till).
 */
function ImportFile({
	editionId,
	mode,
	onCancel,
}: {
	editionId: number
	mode: "import" | "append"
	onCancel?: () => void
}) {
	const router = useRouter()
	const closeDrawer = useDrawerClose()
	const [file, setFile] = useState<File | null>(null)
	const [options, setOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const appending = mode === "append"

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!file || pending) return
		setPending(true)
		setError(null)
		try {
			if (appending) await appendEditionFile(editionId, file, options)
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
					? "Filens kapitel läggs efter utgåvans sista kapitel."
					: "Utgåvan har ingen text ännu."}
			</p>
			<FileField
				label={appending ? "Fil med kapitlet" : "Fil att importera"}
				accept={".txt,.md,.html,.htm,.pdf,.epub,.docx"}
				onFilesChange={files => setFile(files[0] ?? null)}
			/>
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
	const [appending, setAppending] = useState(false)
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
								? [{ label: "Lägg till kapitel…", onSelect: () => setAppending(true) }, "separator" as const]
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
			) : appending ? (
				<ImportFile editionId={edition.id} mode={"append"} onCancel={() => setAppending(false)} />
			) : (
				<ChapterList chapters={edition.chapters} />
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
