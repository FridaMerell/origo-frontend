"use client"

import { useEffect, useState } from "react"
import type { ImportOptions, ImportPreview as Preview, ImportResult } from "@/app/lib/dal/opus"
import { CheckboxField, SelectField, TextField } from "./Fields/Fields"

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = { segmentation: "sentences", front_matter: "keep", label: "" }

/** Namnet ett kapitel utan egen rubrik får om inget annat anges: filens namn, som i backenden. */
function fileStem(file: File) {
	return file.name.replace(/\.[^/.]+$/, "") || file.name
}

/** Importfelen från EditionViewSet har en `code`; de vanligaste får en svensk text. */
const IMPORT_ERRORS: Record<string, string> = {
	already_imported: "Utgåvan har redan importerad text.",
	file_too_large: "Filen får vara högst 10 MB.",
}

type ErrorPayload = { code?: string; detail?: string; error?: string }

/** Skickar en fil med importvalen; felet bär serverns förklaring, inte bara att det gick fel. */
async function postDocument<T>(
	url: string,
	file: File,
	options: ImportOptions,
	failure: string,
): Promise<T> {
	const body = new FormData()
	body.set("file", file, file.name)
	body.set("segmentation", options.segmentation)
	body.set("front_matter", options.front_matter)
	body.set("label", options.label.trim())
	const response = await fetch(url, { method: "POST", body })
	const payload = (await response.json().catch(() => null)) as (T & ErrorPayload) | null
	if (!response.ok || payload === null) {
		const detail = payload?.detail ?? payload?.error
		throw new Error((payload?.code && IMPORT_ERRORS[payload.code]) ?? (detail ? `${failure}: ${detail}` : `${failure}.`))
	}
	return payload
}

/** Importerar en fil till en befintlig utgåva. */
export function importEditionFile(editionId: number, file: File, options: ImportOptions = DEFAULT_IMPORT_OPTIONS) {
	return postDocument<ImportResult>(
		`/api/opus/editions/${editionId}/import-document/`,
		file,
		options,
		"Filen kunde inte importeras",
	)
}

/** Lägger en fil efter utgåvans befintliga text, t.ex. ett kapitel till. */
export function appendEditionFile(editionId: number, file: File, options: ImportOptions) {
	return postDocument<ImportResult>(
		`/api/opus/editions/${editionId}/append-document/`,
		file,
		options,
		"Filen kunde inte läggas till",
	)
}

/** Visar hur en fil skulle importeras, innan utgåvan finns. Ingenting sparas. */
export function previewDocument(file: File, options: ImportOptions) {
	return postDocument<Preview>("/api/opus/editions/preview-document/", file, options, "Filen kunde inte läsas")
}

type Loaded = { file: File; segmentation: ImportOptions["segmentation"]; preview?: Preview; error?: string }

/**
 * Förhandsgranskning av en vald fil: kapitel och antal läsenheter, val av indelning
 * (meningar eller rader), om förtexten före första kapitlet ska tas med och – för en fil
 * utan kapitelrubriker, som blir ett enda kapitel – vad kapitlet ska heta.
 */
export default function ImportPreview({
	file,
	options,
	onOptionsChange,
}: {
	file: File
	options: ImportOptions
	onOptionsChange: (options: ImportOptions) => void
}) {
	const [loaded, setLoaded] = useState<Loaded | null>(null)
	const current = loaded?.file === file && loaded.segmentation === options.segmentation ? loaded : null

	useEffect(() => {
		let cancelled = false
		// Förtexten hämtas alltid med, så att den kan visas och väljas bort här.
		// Namnet hämtas inte om vid varje tangenttryck; det visas lokalt nedan.
		previewDocument(file, { segmentation: options.segmentation, front_matter: "keep", label: "" })
			.then(preview => !cancelled && setLoaded({ file, segmentation: options.segmentation, preview }))
			.catch(
				(error: unknown) =>
					!cancelled &&
					setLoaded({
						file,
						segmentation: options.segmentation,
						error: error instanceof Error ? error.message : "Filen kunde inte läsas.",
					}),
			)
		return () => {
			cancelled = true
		}
	}, [file, options.segmentation])

	const preview = current?.preview
	const skipFrontMatter = options.front_matter === "skip"
	const frontMatter = preview?.chapters.filter(chapter => chapter.front_matter) ?? []
	const skippedUnits = skipFrontMatter ? frontMatter.reduce((sum, chapter) => sum + chapter.paragraph_count, 0) : 0
	const unitCount = (preview?.paragraph_count ?? 0) - skippedUnits
	const chapterCount = Math.max(0, (preview?.chapter_count ?? 0) - (skipFrontMatter ? frontMatter.length : 0))

	return (
		<div className='flex flex-col gap-3 rounded-md border border-border p-4'>
			<SelectField
				label={"Indelning i läsenheter"}
				value={options.segmentation}
				onChange={event =>
					onOptionsChange({ ...options, segmentation: event.target.value as ImportOptions["segmentation"] })
				}
				helpText={"Rader passar vers och drama: varje rad i filen blir en egen enhet."}>
				<option value={"sentences"}>Meningar (prosa)</option>
				<option value={"lines"}>Rader (vers, drama)</option>
			</SelectField>

			{!current && <p className='text-sm text-text-muted'>Läser filen…</p>}
			{current?.error && (
				<p role={"alert"} className={"text-sm text-danger"}>
					{current.error}
				</p>
			)}
			{preview && (
				<>
					<p className='font-mono text-xs uppercase tracking-widest text-text-muted'>
						{unitCount} enheter{chapterCount > 0 ? ` i ${chapterCount} kapitel` : ""}
					</p>
					{!preview.has_headings && (
						<TextField
							label={"Kapitlets namn"}
							value={options.label}
							onChange={event => onOptionsChange({ ...options, label: event.target.value })}
							placeholder={fileStem(file)}
							helpText={"Filen saknar kapitelrubriker och blir ett kapitel. Utan namn används filens namn."}
						/>
					)}
					{preview.front_matter_count > 0 && (
						<CheckboxField
							label={`Ta med förtexten (${preview.front_matter_count} ${preview.front_matter_count === 1 ? "del" : "delar"} före första kapitlet)`}
							checked={!skipFrontMatter}
							onChange={event => onOptionsChange({ ...options, front_matter: event.target.checked ? "keep" : "skip" })}
						/>
					)}
					<ol className='flex max-h-64 flex-col divide-y divide-border overflow-y-auto'>
						{preview.chapters.map(chapter => (
							<li
								key={chapter.position}
								className={`flex flex-col gap-0.5 py-2 ${chapter.front_matter && skipFrontMatter ? "opacity-40 line-through" : ""}`}>
								<span className='flex items-baseline justify-between gap-3 text-sm text-text'>
									<span className='min-w-0 truncate'>
										{preview.has_headings ? chapter.label : options.label.trim() || fileStem(file)}
									</span>
									<span className='shrink-0 font-mono text-xs text-text-muted'>{chapter.paragraph_count}</span>
								</span>
								{chapter.preview && <span className='truncate text-xs text-text-muted'>{chapter.preview}</span>}
							</li>
						))}
					</ol>
					{preview.preview_truncated && (
						<p className='text-xs text-text-muted'>Visar de första {preview.chapters.length} kapitlen.</p>
					)}
				</>
			)}
		</div>
	)
}
