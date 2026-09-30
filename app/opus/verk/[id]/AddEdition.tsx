"use client"

import { useActionState, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import { Drawer, useDrawerClose } from "@/app/components/ui/Drawer"
import type { ImportOptions } from "@/app/lib/dal/opus"
import { createEdition, type CreateEditionState } from "../../_actions/editions"
import { FileField, SelectField, TextField, TitleField } from "../../forms/Fields/Fields"
import ImportPreview, { DEFAULT_IMPORT_OPTIONS, importEditionFile } from "../../forms/ImportPreview"

const initialState: CreateEditionState = {}

function AddEditionForm({ workId }: { workId: number }) {
	const router = useRouter()
	const close = useDrawerClose()
	const formRef = useRef<HTMLFormElement>(null)
	const [file, setFile] = useState<File | null>(null)
	const [importOptions, setImportOptions] = useState<ImportOptions>(DEFAULT_IMPORT_OPTIONS)

	async function action(previousState: CreateEditionState, formData: FormData): Promise<CreateEditionState> {
		const result = await createEdition(workId, previousState, formData)
		if (!result.success || !result.editionId) return result

		if (file) {
			try {
				await importEditionFile(result.editionId, file, importOptions)
			} catch (error) {
				// Utgåvan finns redan; visa den och låt användaren importera om från dess index
				// i stället för att skicka formuläret igen (vilket skulle skapa en dubblett).
				router.refresh()
				const reason = error instanceof Error ? error.message : "Filen kunde inte importeras."
				return { error: `Utgåvan skapades, men importen misslyckades. ${reason} Välj utgåvan i listan för att importera en fil igen.` }
			}
		}

		formRef.current?.reset()
		setFile(null)
		setImportOptions(DEFAULT_IMPORT_OPTIONS)
		router.refresh()
		close()
		return result
	}

	const [state, formAction, pending] = useActionState(action, initialState)

	return (
		<form ref={formRef} action={formAction} className={"flex flex-col gap-4"}>
			<TitleField
				label={"Titel på utgåvan"}
				name={"title"}
				placeholder={"Till exempel: Första utgåvan"}
				required
			/>
			<TextField
				label={"Utgåvebeteckning"}
				name={"edition"}
				placeholder={"Till exempel: 2:a upplagan"}
			/>
			<div className={"grid grid-cols-2 gap-4"}>
				<SelectField label={"Språk"} name={"language"} defaultValue={"sv"} required>
					<option value={"sv"}>Svenska</option>
					<option value={"en"}>Engelska</option>
					<option value={"de"}>Tyska</option>
					<option value={"is"}>Isländska</option>
				</SelectField>
				<TextField label={"Annat språk"} name={"customLanguage"} placeholder={"Om relevant"} />
			</div>
			<TextField
				label={"Källa"}
				name={"source"}
				placeholder={"Till exempel: Projekt Gutenberg eller eget digitalisat"}
			/>
			<FileField
				label={"Fil att importera (valfritt)"}
				accept={".txt,.md,.html,.htm,.pdf,.epub,.docx"}
				onFilesChange={files => setFile(files[0] ?? null)}
			/>
			{file && <ImportPreview file={file} options={importOptions} onOptionsChange={setImportOptions} />}
			{state.error && (
				<p role={"alert"} className={"text-sm text-danger"}>
					{state.error}
				</p>
			)}
			<div className={"flex justify-end gap-3"}>
				<Button type={"button"} variant={"ghost"} onClick={close}>
					Avbryt
				</Button>
				<Button type={"submit"} disabled={pending}>
					{pending ? "Sparar…" : "Lägg till"}
				</Button>
			</div>
		</form>
	)
}

export default function AddEdition({ workId }: { workId: number }) {
	return (
		<Drawer
			triggerVariant={"unstyled"}
			triggerClassName={"cursor-pointer"}
			title={"Lägg till utgåva"}
			trigger={
				<span className={"font-mono text-sm text-text-muted hover:text-text"}>
					+ Lägg till utgåva
				</span>
			}>
			<AddEditionForm workId={workId} />
		</Drawer>
	)
}
