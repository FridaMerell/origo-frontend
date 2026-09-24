'use client'

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Modal } from "@/app/components/ui/Modal"
import { useToast } from "@/app/components/ui/ToastProvider"
import type { Shelf } from "@/app/lib/dal/opus"
import type { NewTextVersion } from "../_actions/actions"
import { CheckboxField, FileField, SelectField, TextField, TitleField } from "./Fields/Fields"

type NewWorkFormProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

type WizardStep = 1 | 2
type DraftEdition = NewTextVersion & { file: File | null }

const newEdition = (title = ""): DraftEdition => ({
	title,
	language: "sv",
	customLanguage: "",
	edition: "",
	source: "",
	file: null,
})

function titleFromFile(file: File) {
	return file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() || file.name
}

const buttonClass =
	"rounded-md px-4 py-2.5 font-body text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

/** The standalone Opus creation widget. The parent decides when to open it. */
export default function NewWorkForm({ open, onOpenChange }: NewWorkFormProps) {
	const router = useRouter()
	const { toast } = useToast()
	const [step, setStep] = useState<WizardStep>(1)
	const [work, setWork] = useState({ title: "", author: "", year: "", isPrivate: false, shelves: [] as number[] })
	const [editions, setEditions] = useState<DraftEdition[]>([])
	const [shelves, setShelves] = useState<Shelf[]>([])
	const [newShelfName, setNewShelfName] = useState("")
	const [shelvesError, setShelvesError] = useState<string>()
	const [isLoadingShelves, setIsLoadingShelves] = useState(false)
	const [isCreatingShelf, setIsCreatingShelf] = useState(false)
	const [error, setError] = useState<string>()
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		if (!open) return
		setStep(1)
		setWork({ title: "", author: "", year: "", isPrivate: false, shelves: [] })
		setEditions([])
		setNewShelfName("")
		setShelvesError(undefined)
		setError(undefined)
		setIsLoadingShelves(true)
		void fetch("/api/opus/shelves/")
			.then(response => response.ok ? response.json() as Promise<Shelf[]> : Promise.reject())
			.then(setShelves)
			.catch(() => setShelvesError("Hyllorna kunde inte hämtas."))
			.finally(() => setIsLoadingShelves(false))
	}, [open])

	function continueToEditions() {
		if (!work.title.trim()) {
			setError("Ange verkets titel.")
			return
		}
		setError(undefined)
		setEditions(current => current.length ? current : [newEdition(work.title.trim())])
		setStep(2)
	}

	function updateEdition(index: number, patch: Partial<DraftEdition>) {
		setEditions(current => current.map((edition, editionIndex) =>
			editionIndex === index ? { ...edition, ...patch } : edition,
		))
	}

	function addEditionFiles(files: File[]) {
		if (!files.length) return
		setError(undefined)
		const editionsFromFiles = files.map(file => ({ ...newEdition(titleFromFile(file)), file }))
		setEditions(current => current.length === 1 && !current[0].file ? editionsFromFiles : [...current, ...editionsFromFiles])
	}

	function toggleShelf(shelfId: number) {
		setWork(current => ({
			...current,
			shelves: current.shelves.includes(shelfId) ? current.shelves.filter(id => id !== shelfId) : [...current.shelves, shelfId],
		}))
	}

	async function createShelf() {
		const name = newShelfName.trim()
		if (!name) return
		setShelvesError(undefined)
		setIsCreatingShelf(true)
		try {
			const response = await fetch("/api/opus/shelves/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
			const shelf = await response.json() as Shelf | { error: string }
			if (!response.ok || "error" in shelf) throw new Error("Hyllan kunde inte skapas.")
			setShelves(current => [...current, shelf])
			setWork(current => ({ ...current, shelves: [...current.shelves, shelf.id] }))
			setNewShelfName("")
		} catch (shelfError) {
			setShelvesError(shelfError instanceof Error ? shelfError.message : "Hyllan kunde inte skapas.")
		} finally {
			setIsCreatingShelf(false)
		}
	}

	async function importEditionFile(editionId: number, file: File) {
		const body = new FormData()
		body.set("file", file)
		const response = await fetch(`/api/opus/editions/${editionId}/import-document/`, { method: "POST", body })
		if (!response.ok) throw new Error("Filen kunde inte importeras.")
	}

	async function createWorkWithEditions() {
		const response = await fetch("/api/opus/works/create-with-editions/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ work, editions: editions.map(({ file, ...edition }) => edition) }),
		})
		return (await response.json()) as { editions?: { id: number; title: string }[]; error?: string }
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (step === 1) {
			continueToEditions()
			return
		}

		setError(undefined)
		setIsSubmitting(true)
		try {
			if (editions.some(edition => !edition.file)) {
				throw new Error("Varje utgåva behöver en fil.")
			}
			const result = await createWorkWithEditions()
			if (result.error || !result.editions) {
				setError(result.error ?? "Verket och utgåvorna kunde inte sparas.")
				toast({ title: "Kunde inte skapa verket", description: result.error ?? "Försök igen.", variant: "error" })
				return
			}
			await Promise.all(result.editions.map(async (createdEdition, index) => {
				const edition = editions[index]
				if (!edition.file) throw new Error("Varje utgåva behöver en fil.")
				await importEditionFile(createdEdition.id, edition.file)
			}))

			onOpenChange(false)
			toast({
				title: "Verket är skapat",
				description: `${work.title.trim()} har lagts till med ${editions.length} ${editions.length === 1 ? "utgåva" : "utgåvor"}.`,
				variant: "success",
			})
			router.refresh()
		} catch (importError) {
			setError(importError instanceof Error ? importError.message : "Filerna kunde inte importeras.")
			toast({ title: "Importen misslyckades", description: "Verket och dess utgåvor finns kvar, men minst en fil kunde inte importeras.", variant: "error" })
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Modal
			open={open}
			onOpenChange={onOpenChange}
			title={<span className='font-display text-lg font-semibold text-text'>Ladda upp en ny bok</span>}
			description='Skapa verket och lägg till de utgåvor du vill läsa.'
			size='lg'>
			<form id='new-work-form' onSubmit={handleSubmit} className='grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8'>
				<aside className='flex flex-col border-b border-border pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8'>
					<h3 className='m-0 font-display text-2xl font-semibold leading-tight text-text sm:text-3xl'>Verk</h3>
					<p className='mt-3 hidden text-sm leading-relaxed text-text-muted lg:block'>Först beskriver du verket. Därefter lägger du till filerna för dess utgåvor.</p>
					<nav className='mt-4 flex flex-row gap-5 text-sm lg:mt-8 lg:flex-col lg:gap-3 lg:text-base' aria-label='Steg i formuläret'>
						{step === 1 ? <span aria-current='step' className='font-display font-semibold text-primary'>1. Verk</span> : <button type='button' onClick={() => setStep(1)} className='w-fit font-display text-left text-text-muted hover:text-primary'>1. Verk</button>}
						<span aria-current={step === 2 ? "step" : undefined} className={`font-display ${step === 2 ? "font-semibold text-primary" : "text-text-muted"}`}>2. Utgåvor</span>
				</nav>
				</aside>
				<div className='flex min-w-0 flex-col'>

				{step === 1 ? (
					<div className='flex flex-1 flex-col gap-6'>
						<div>
							<h3 className='m-0 font-display text-2xl font-semibold text-text'>Om verket</h3>
							<p className='mt-2 max-w-[48ch] text-sm leading-relaxed text-text-muted'>Den här informationen gäller boken eller verket, oavsett vilka utgåvor du lägger till.</p>
						</div>
						<div className='grid gap-5'>
						<TitleField
							label='Titel'
							name='title'
							value={work.title}
							onChange={event => setWork(current => ({ ...current, title: event.target.value }))}
							placeholder='Till exempel: Stolthet och fördom'
							error={error === "Ange verkets titel." ? error : undefined}
							autoFocus
							required
						/>
						<div className='grid gap-5 sm:grid-cols-2'>
							<TextField label='Författare' name='author' value={work.author} onChange={event => setWork(current => ({ ...current, author: event.target.value }))} placeholder='Till exempel: Jane Austen' />
							<TextField label='Originalår eller tidsperiod' name='year' value={work.year} onChange={event => setWork(current => ({ ...current, year: event.target.value }))} maxLength={100} placeholder='Till exempel: 1813 eller 1400-tal' />
						</div>
						<div className='border-y border-border py-4'>
							<div className='flex items-baseline justify-between gap-4'>
								<h4 className='m-0 font-body text-sm font-semibold text-text'>Hyllor</h4>
								<p className='m-0 text-xs text-text-muted'>Valfritt</p>
							</div>
							{isLoadingShelves ? <p className='mt-3 mb-0 text-sm text-text-muted'>Hämtar hyllor…</p> : shelves.length > 0 && <div className='mt-3 flex flex-wrap gap-x-5 gap-y-3'>{shelves.map(shelf => <CheckboxField key={shelf.id} label={shelf.name} checked={work.shelves.includes(shelf.id)} onChange={() => toggleShelf(shelf.id)} />)}</div>}
							{shelvesError && <p role='alert' className='mt-3 mb-0 text-xs text-danger'>{shelvesError}</p>}
							<div className='mt-3 flex flex-wrap items-end gap-3'>
								<div className='min-w-52 flex-1'><TextField label='Ny hylla' name='new-shelf' value={newShelfName} onChange={event => setNewShelfName(event.target.value)} placeholder='Till exempel: Klassiker' /></div>
								<button type='button' disabled={isCreatingShelf || !newShelfName.trim()} onClick={createShelf} className={`${buttonClass} border border-primary text-primary hover:bg-primary hover:text-bg disabled:cursor-not-allowed disabled:opacity-50`}>{isCreatingShelf ? "Skapar…" : "Skapa hylla"}</button>
							</div>
						</div>
						<CheckboxField label='Lägg i personligt bibliotek' name='is-private' checked={work.isPrivate} onChange={event => setWork(current => ({ ...current, isPrivate: event.target.checked }))} />
						</div>
					</div>
				) : (
					<div className='flex flex-1 flex-col gap-5'>
						<div>
							<h3 className='m-0 font-display text-lg font-semibold text-text'>Lägg till en utgåva</h3>
							<p className='mt-1 text-sm leading-relaxed text-text-muted'>Släpp en eller flera filer för att skapa utgåvor direkt. Filnamnet blir utgåvans titel, som du kan ändra efteråt.</p>
						</div>
						<FileField label='Lägg till filer' name='edition-files' accept='.txt,.md,.html,.htm,.pdf,.epub,.docx' multiple onFilesChange={addEditionFiles} />
						{editions.map((edition, index) => (
							<div key={index} className='flex flex-col gap-5 border-t border-border pt-5 first:border-t-0 first:pt-0'>
								<div className='flex items-center justify-between'>
									<p className='m-0 font-display text-lg font-semibold text-text'>Utgåva {index + 1}</p>
									{editions.length > 1 && (
										<button type='button' onClick={() => setEditions(current => current.filter((_, editionIndex) => editionIndex !== index))} className='font-body text-xs text-text-muted underline underline-offset-4 hover:text-danger'>Ta bort</button>
									)}
								</div>
								<div className='grid gap-4 sm:grid-cols-2'>
									<TextField label='Titel på utgåvan' name={`edition-${index}-title`} value={edition.title} onChange={event => updateEdition(index, { title: event.target.value })} placeholder='Till exempel: Första utgåvan' required />
									<TextField label='Utgåvebeteckning' name={`edition-${index}-edition`} value={edition.edition} onChange={event => updateEdition(index, { edition: event.target.value })} placeholder='Till exempel: 2:a upplagan' />
									<div className='grid gap-4 sm:col-span-2 sm:grid-cols-2'>
										<SelectField label='Språk' name={`edition-${index}-language`} value={edition.language} onChange={event => updateEdition(index, { language: event.target.value })} required>
									<option value='sv'>Svenska</option>
									<option value='en'>Engelska</option>
									<option value='de'>Tyska</option>
									<option value='is'>Isländska</option>
										</SelectField>
										<TextField label='Annat språk' name={`edition-${index}-custom-language`} value={edition.customLanguage} onChange={event => updateEdition(index, { customLanguage: event.target.value })} placeholder='Om relevant' />
									</div>
								</div>
								<TextField label='Källa' name={`edition-${index}-source`} value={edition.source} onChange={event => updateEdition(index, { source: event.target.value })} placeholder='Till exempel: Projekt Gutenberg eller eget digitalisat' />
								<FileField label='Fil' name={`edition-${index}-file`} accept='.txt,.md,.html,.htm,.pdf,.epub,.docx' onFilesChange={files => updateEdition(index, { file: files[0] ?? null })} />
							</div>
						))}
						<div className='flex items-center justify-between gap-3'>
							<button type='button' onClick={() => setEditions(current => [...current, newEdition(work.title.trim())])} className='font-body text-sm font-semibold text-primary underline underline-offset-4 hover:text-text'>+ Lägg till utgåva</button>
						</div>
					</div>
				)}

				<div className='mt-7 flex flex-wrap items-center justify-end gap-3 sm:gap-4'>
					{error && error !== "Ange verkets titel." && <p role='alert' className='mr-auto text-xs text-danger'>{error}</p>}
					<button type='button' onClick={() => onOpenChange(false)} className='font-body text-sm text-text-muted underline underline-offset-4 hover:text-text'>Avbryt</button>
					<button type='submit' disabled={isSubmitting} className={`${buttonClass} bg-primary text-bg hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50`}>{isSubmitting ? "Sparar och importerar…" : step === 1 ? "Fortsätt" : "Spara verk och utgåvor"}</button>
				</div>
				</div>
			</form>
		</Modal>
	)
}
