"use client"

import { useEffect, useState } from "react"
import { XIcon } from "lucide-react"
import { Drawer } from "@/app/components/ui/Drawer"
import type { AlignmentMatrix, AutoMatchChaptersResult, Id } from "@/app/lib/dal/opus"
import { alignTexts } from "../../_actions/alignment-actions"
import { SelectField } from "../../forms/Fields/Fields"

export type EditionInfo = { id: Id; title: string; chapters: { id: Id; label: string }[] }
export type SyncColumn = { versionId: Id; editionId: Id; title: string }

type Item = { alignment_version: Id; unit: Id }
type Staged = { items: Item[]; labels: { title: string; chapter: string }[] }

// Jämför kapitelnamn utan versaler, accenter, skiljetecken och inledande "Kapitel 1." så att
// "Kapitel 1. Rövaren och den rätte Herren" och "Rövaren och den rätte Herren" räknas som samma.
const normaliseLabel = (label: string) =>
	label
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/^\s*(kapitel|kap|chapter)\.?\s*\d+\s*[.:)\-–—]?\s*/u, "")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim()

// Serverns fel kommer som `400 Bad Request: {"detail":["…"]}`; visa bara meddelandet.
function errorText(error: unknown, fallback: string) {
	if (!(error instanceof Error)) return fallback
	const json = error.message.slice(error.message.indexOf("{"))
	try {
		const parsed = JSON.parse(json) as Record<string, unknown>
		const first = Object.values(parsed).flat()[0]
		if (typeof first === "string") return first
	} catch {}
	return fallback
}

/**
 * Manuell kapitelsynk för många utgåvor och kapitel på en gång, i en popup:
 * 1. välj ett kapitel per utgåva och lägg till gruppen i listan (så många grupper man vill),
 * 2. förhandsgranska vad som händer (torrkörning, ingenting sparas),
 * 3. Applicera — sparar alignmentet och sätter läspositionen till det första kapitlet i listan.
 * Vyn tar dig sedan till det kapitlet.
 */
export default function ChapterSync({
	setId,
	columns,
	editions,
	limit,
	disabled,
	onApplied,
}: {
	setId: Id
	columns: SyncColumn[]
	editions: EditionInfo[]
	/** Antal rader som visas nu; svaret efter Applicera innehåller lika många. */
	limit: number
	disabled: boolean
	onApplied: (matrix: AlignmentMatrix) => void
}) {
	const [open, setOpen] = useState(false)
	const [chosen, setChosen] = useState<Record<Id, number>>({})
	const [staged, setStaged] = useState<Staged[]>([])
	const [plan, setPlan] = useState<AutoMatchChaptersResult | null>(null)
	const [problem, setProblem] = useState<string | null>(null)
	const [previewing, setPreviewing] = useState(false)
	const [applying, setApplying] = useState(false)

	const chaptersOf = (column: SyncColumn) => editions.find(edition => edition.id === column.editionId)?.chapters ?? []
	const groups = staged.map(entry => entry.items)

	// Förhandsgranskning: torrkörning av hela listan varje gång den ändras.
	useEffect(() => {
		if (staged.length === 0) {
			setPlan(null)
			setProblem(null)
			return
		}
		let cancelled = false
		setPreviewing(true)
		alignTexts(setId, staged.map(entry => entry.items), { offset: 0, limit: 1 }, true)
			.then(matrix => {
				if (cancelled) return
				setPlan(matrix.result ?? null)
				setProblem(null)
			})
			.catch(error => {
				if (cancelled) return
				setPlan(null)
				setProblem(errorText(error, "Listan kan inte appliceras som den är."))
			})
			.finally(() => !cancelled && setPreviewing(false))
		return () => {
			cancelled = true
		}
	}, [staged, setId])

	function choose(column: SyncColumn, chapterId: number) {
		setChosen(prev => {
			const next = { ...prev, [column.versionId]: chapterId }
			// Väljer man ett kapitel föreslås kapitlet med samma namn i de utgåvor som saknar val.
			const label = chaptersOf(column).find(chapter => chapter.id === chapterId)?.label
			if (label) {
				for (const other of columns) {
					if (other.versionId === column.versionId || next[other.versionId]) continue
					const match = chaptersOf(other).find(chapter => normaliseLabel(chapter.label) === normaliseLabel(label))
					if (match) next[other.versionId] = match.id
				}
			}
			return next
		})
	}

	const picked = columns.filter(column => chosen[column.versionId])

	function addToList() {
		if (picked.length < 2) return
		setStaged(prev => [
			...prev,
			{
				items: picked.map(column => ({ alignment_version: column.versionId, unit: chosen[column.versionId] })),
				labels: picked.map(column => ({
					title: column.title,
					chapter: chaptersOf(column).find(chapter => chapter.id === chosen[column.versionId])?.label ?? "",
				})),
			},
		])
		// Gå vidare till nästa kapitel i varje utgåva som var med.
		setChosen(prev => {
			const next = { ...prev }
			for (const column of picked) {
				const chapters = chaptersOf(column)
				const index = chapters.findIndex(chapter => chapter.id === prev[column.versionId])
				next[column.versionId] = chapters[index + 1]?.id ?? 0
			}
			return next
		})
	}

	async function apply() {
		if (staged.length === 0 || applying) return
		setApplying(true)
		setProblem(null)
		try {
			const matrix = await alignTexts(setId, groups, { offset: 0, limit }, false)
			onApplied(matrix)
			setStaged([])
			setChosen({})
			setPlan(null)
			setOpen(false)
		} catch (error) {
			setProblem(errorText(error, "Kunde inte spara. Ingenting har ändrats."))
		} finally {
			setApplying(false)
		}
	}

	const titleOf = (versionId: string | number) => columns.find(column => column.versionId === Number(versionId))?.title ?? ""

	return (
		<Drawer
			open={open}
			onOpenChange={setOpen}
			triggerVariant='unstyled'
			title='Synka kapitel'
			trigger={`Synka kapitel manuellt${staged.length ? ` (${staged.length})` : ""}`}
			triggerClassName={`inline-flex items-center rounded border border-border px-3 py-1.5 font-body text-sm text-text hover:border-text/40 cursor-pointer ${
				disabled ? "pointer-events-none opacity-40" : ""
			}`}>
			<div className='flex flex-col gap-5 p-1 text-text'>
				<p className='text-sm text-text/80'>
					Välj motsvarande kapitel i varje utgåva och lägg till gruppen i listan. Lägg till så många grupper du vill,
					granska planen och tryck <strong>Applicera</strong> för att spara.
				</p>

				<div className='flex flex-col gap-3'>
					{columns.map(column => (
						<SelectField
							key={column.versionId}
							label={column.title}
							value={chosen[column.versionId] ?? 0}
							onChange={e => choose(column, Number(e.target.value))}>
							<option value={0}>— hoppa över —</option>
							{chaptersOf(column).map(chapter => (
								<option key={chapter.id} value={chapter.id}>
									{chapter.label}
								</option>
							))}
						</SelectField>
					))}
					<button
						type='button'
						disabled={picked.length < 2}
						onClick={addToList}
						className='self-start rounded-md border border-text bg-transparent px-3 py-1.5 text-sm font-medium text-text hover:bg-text/10 disabled:cursor-not-allowed disabled:border-text/40 disabled:text-text/50 cursor-pointer'>
						Lägg till i listan
					</button>
					{picked.length < 2 && <p className='text-xs text-text/80'>Välj kapitel i minst två utgåvor.</p>}
				</div>

				<div className='flex flex-col gap-2 border-t border-border pt-4'>
					<h3 className='font-mono text-xs uppercase tracking-widest text-text/80'>Att applicera ({staged.length})</h3>
					{staged.length === 0 && <p className='text-sm text-text/80'>Listan är tom.</p>}
					<ol className='flex flex-col gap-2'>
						{staged.map((entry, index) => {
							const planned = plan?.groups?.find(group => group.index === index)
							const gaps = planned ? Object.entries(planned.gaps) : []
							return (
								<li key={index} className='rounded border border-border p-2 text-sm'>
									<div className='flex items-start justify-between gap-2'>
										<ul className='min-w-0'>
											{entry.labels.map(label => (
												<li key={label.title} className='truncate'>
													<span className='text-text/80'>{label.title}: </span>
													{label.chapter}
												</li>
											))}
										</ul>
										<button
											type='button'
											title='Ta bort från listan'
											aria-label='Ta bort från listan'
											onClick={() => setStaged(prev => prev.filter((_, i) => i !== index))}
											className='shrink-0 text-text/80 hover:text-text cursor-pointer'>
											<XIcon size={14} />
										</button>
									</div>
									{planned && (
										<p className='mt-1 text-xs text-text/80'>
											Hamnar på rad {planned.row + 1}
											{gaps.length > 0
												? ` · ${gaps.map(([versionId, count]) => `+${count} i ${titleOf(versionId)}`).join(", ")}`
												: " · redan i synk"}
										</p>
									)}
								</li>
							)
						})}
					</ol>

					{previewing && <p className='text-xs text-text/80'>Räknar ut planen…</p>}
					{plan && !previewing && (
						<p className='text-sm'>
							{plan.inserted_gaps === 0
								? "Inget behöver ändras: kapitlen ligger redan på samma rader."
								: `${plan.inserted_gaps} luckor läggs in.`}{" "}
							<span className='text-text/80'>Läspositionen sätts till första kapitlet i listan.</span>
						</p>
					)}
					{problem && <p className='text-sm text-primary'>{problem}</p>}
				</div>

				<div className='flex flex-wrap items-center gap-3'>
					<button
						type='button'
						disabled={staged.length === 0 || previewing || applying || Boolean(problem)}
						onClick={apply}
						className='rounded-md px-4 py-2 text-sm font-semibold bg-primary text-bg hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-text/15 disabled:text-text/50 cursor-pointer'>
						{applying ? "Sparar…" : "Applicera"}
					</button>
					{staged.length === 0 && <span className='text-xs text-text/80'>Lägg till minst en grupp först.</span>}
					<button
						type='button'
						disabled={staged.length === 0 && picked.length === 0}
						onClick={() => {
							setStaged([])
							setChosen({})
						}}
						className='text-sm text-text underline underline-offset-4 hover:text-primary disabled:text-text/50 disabled:no-underline cursor-pointer disabled:cursor-not-allowed'>
						Rensa
					</button>
				</div>
			</div>
		</Drawer>
	)
}
