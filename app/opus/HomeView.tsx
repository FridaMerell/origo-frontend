"use client"

import { LoginForm } from "../login/login-form"
import { useUser } from "../lib/user-context"
import Divider from "./ui/Divider"
import { useWorks } from "./_state/opus-context"
import type { ReadingProgressOverview, Work } from "../lib/dal/opus"
import opus from "./assets/opus.png"
import Image from "next/image"
import NewWorkForm from "./forms/NewWorkForm"
import { SelectField, TextField } from "./forms/Fields/Fields"
import { useMemo, useState } from "react"
import Link from "next/link"

function SignedOut() {
	return (
		<section className='container py-12 sm:py-16'>
			<div className='grid gap-12 border-b border-border pb-12 lg:grid-cols-[1fr_.8fr] lg:gap-20 lg:pb-16'>
				<div className='order-2 lg:order-1'>
					<h1 className='font-display text-5xl font-semibold tracking-tight text-text sm:text-6xl'>
						Opus
					</h1>
					<p className='mt-5 font-display text-2xl leading-tight text-text sm:text-3xl mb-2'>
						Läs böcker och jämför utgåvor.
					</p>
					<p className={"text-text-muted"}>
						I Opus kan du ladda upp copyright-fira böcker i .docx, epub, .txt,
						och PDF-format. Ladda upp flera utgåvor för att följa textens
						förändringar över tid och genom olika tolkningar eller
						översättningar.
						<br />
						<br />
						Det finns också stöd för anteckningar, definitioner, och
						synkroniserad läsning på olika enheter.
					</p>
				</div>
				<div className='order-1 border-l border-primary pl-6 sm:pl-8 lg:order-2'>
					<h2 className='font-display text-2xl font-semibold text-text'>
						Logga in
					</h2>
					<p className='mt-2 text-sm leading-6 text-text-muted'>
						Använd dina Origo-uppgifter.
					</p>
					<div className='mt-6'>
						<LoginForm
							variant='tenant'
							buttonClass='border border-text !bg-transparent !text-text hover:!bg-text hover:!text-bg'
						/>
					</div>
				</div>
			</div>
		</section>
	)
}

/** Synlig fokusmarkering för tangentbordsnavigering, samma som Opus formulärfält. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

/** Ryggens färg per verk (temats bordeaux, svart och ockra); samma verk får alltid samma rygg. */
const SPINES = ["bg-primary", "bg-secondary", "bg-accent"]

/** Var man senast var i boken, eller att den inte är påbörjad. */
function lastPlace(progress: ReadingProgressOverview | undefined) {
	if (!progress) return "Inte påbörjad"
	if (!progress.unit) return progress.percent === 100 ? "Utläst" : "Påbörjad"
	// "0 %" säger inget om en nyss öppnad bok; då räcker kapitlet.
	const percent = progress.percent > 0 ? `${progress.percent} %` : null
	const where = [progress.unit.chapter?.label, percent].filter(Boolean).join(" · ") || "början"
	return `Senast: ${where}`
}

/** Liten rad i versaler (författare, år, fakta), som i förlagan. */
const SMALL_CAPS = "font-body text-xs uppercase tracking-widest text-text-muted"

/** Ett verk som en bok: färgad rygg, titeln med stor anfang och utgåvorna som en förteckning. */
function Book({ work, progress }: { work: Work; progress?: ReadingProgressOverview }) {
	const authors = work.contributors
		.filter(c => c.role === "author")
		.map(c => c.author.name)
		.join(", ")
	const byline = [authors, work.year].filter(Boolean).join(" · ")
	const editionCount = `${work.editions.length} ${work.editions.length === 1 ? "utgåva" : "utgåvor"}`

	return (
		<li>
			<Link
				href={`/verk/${work.id}`}
				className={`group flex h-full overflow-hidden rounded-xl border border-border bg-surface shadow-md transition-shadow duration-300 hover:shadow-lg ${FOCUS}`}>
				<span aria-hidden className={`w-4 shrink-0 ${SPINES[work.id % SPINES.length]}`} />
				<div className='flex min-w-0 flex-1 flex-col px-6 pt-5 pb-4'>
					<p className={`truncate ${SMALL_CAPS}`}>{byline || " "}</p>
					<h2 className='mt-2 line-clamp-2 font-display text-2xl font-semibold leading-tight tracking-tight text-text first-letter:mr-0.5 first-letter:text-5xl first-letter:font-bold first-letter:leading-none first-letter:text-primary'>
						{work.title}
					</h2>
					<ol className='mt-3 flex flex-col gap-1'>
						{work.editions.map((edition, index) => (
							<li key={edition.id} className='flex items-center gap-3'>
								<span aria-hidden className='w-3 shrink-0 text-right font-body text-xs text-text-faint'>
									{index + 1}
								</span>
								<span aria-hidden className='h-px w-3 shrink-0 bg-text-faint/50' />
								<span className='truncate font-display text-base text-text'>{edition.title}</span>
							</li>
						))}
					</ol>
					<div className='mt-auto pt-4'>
						<div className='flex items-baseline justify-between gap-4 border-t border-dashed border-border pt-3'>
							<p className={SMALL_CAPS}>{[editionCount, ...work.shelf_names].join(" · ")}</p>
							<span className='shrink-0 font-body text-xs uppercase tracking-widest text-primary'>
								Öppna <span aria-hidden className='inline-block transition-transform duration-300 group-hover:translate-x-1'>→</span>
							</span>
						</div>
						<p className='mt-1 truncate font-body text-xs text-text-muted'>{lastPlace(progress)}</p>
					</div>
				</div>
			</Link>
		</li>
	)
}

function matchesQuery(work: Work, query: string) {
	const haystack = [work.title, work.year, ...work.contributors.map(c => c.author.name), ...work.editions.map(e => e.title)]
		.join(" ")
		.toLocaleLowerCase("sv")
	return haystack.includes(query.toLocaleLowerCase("sv"))
}

export default function HomeView({ progress = [] }: { progress?: ReadingProgressOverview[] }) {
	const user = useUser()
	const { works, selectedWork } = useWorks()
	const [newFormOpen, setFormOpen] = useState<boolean>(false)
	const [shelf, setShelf] = useState<string | null>(null)
	const [query, setQuery] = useState("")

	const shelves = useMemo(
		() => [...new Set(works.flatMap(work => work.shelf_names))].sort((a, b) => a.localeCompare(b, "sv")),
		[works],
	)
	const progressByWork = useMemo(() => new Map(progress.map(entry => [entry.work, entry])), [progress])
	const shown = useMemo(
		() =>
			works.filter(
				work => (!shelf || work.shelf_names.includes(shelf)) && (!query.trim() || matchesQuery(work, query.trim())),
			),
		[works, shelf, query],
	)

	if (!user) return <SignedOut />

	const editionCount = shown.reduce((sum, work) => sum + work.editions.length, 0)
	const filtered = shelf !== null || query.trim() !== ""

	return (
		<div className='flex flex-col gap-5'>
			<section className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
				<div className='flex items-end gap-5'>
					<div className='flex max-w-md flex-col'>
						<span className='font-body text-xs uppercase tracking-widest text-primary'>Bibliotek</span>
						<h1 className='mt-1 font-display text-4xl font-bold text-text'>Bokhylla</h1>
						<p className='mt-2 text-text-muted'>
							Väl eller ladda upp ett verk. Varje verk kan ha egna utgåvor, översättningar, eller tolkningar.
						</p>
					</div>
					{selectedWork && <Image height='120' src={opus.src} alt='' />}
				</div>
				{works.length > 0 && (
					<div className='grid gap-3 sm:grid-cols-2 md:w-xl'>
						<SelectField
							label='Hylla'
							hideLabel
							value={shelf ?? ""}
							onChange={event => setShelf(event.target.value || null)}>
							<option value=''>Alla hyllor</option>
							{shelves.map(name => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</SelectField>
						<TextField
							label='Sök i bokhyllan'
							hideLabel
							type='search'
							value={query}
							onChange={event => setQuery(event.target.value)}
							placeholder='Sök på titel, författare eller utgåva'
						/>
					</div>
				)}
			</section>
			<Divider>
				<span className='font-display italic oldstyle-nums'>
					{works.length === 0
						? "Inga böcker ännu"
						: `${shown.length} ${shown.length === 1 ? "bok" : "böcker"} · ${editionCount} ${
								editionCount === 1 ? "utgåva" : "utgåvor"
							}${filtered ? ` av ${works.length}` : ""}`}
				</span>
			</Divider>
			{/* Lika höga rader (auto-rows-fr), så att böckerna står i jämn höjd i hyllan. */}
			{/* Alla kort lika höga (auto-rows-fr), oavsett rad. */}
			<ul className='grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3'>
				{shown.map(work => (
					<Book work={work} progress={progressByWork.get(work.id)} key={work.id} />
				))}
				{!filtered && (
					<li>
						<button
							type='button'
							onClick={() => setFormOpen(true)}
							className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border px-6 py-5 text-center text-text-muted transition-colors duration-300 hover:border-text-muted cursor-pointer ${FOCUS}`}>
							<span aria-hidden className='font-display text-2xl text-primary'>+</span>
							<span className='font-display text-xl text-text'>Ladda upp en ny bok</span>
							<span className='max-w-xs text-sm'>
								Börja med en originalutgåva, lägg sedan till översättningar och tolkningar.
							</span>
						</button>
					</li>
				)}
			</ul>
			{filtered && shown.length === 0 && (
				<p className='text-center font-display text-lg italic text-text-muted'>Inga böcker matchar.</p>
			)}
			<NewWorkForm open={newFormOpen} onOpenChange={setFormOpen} />
		</div>
	)
}
