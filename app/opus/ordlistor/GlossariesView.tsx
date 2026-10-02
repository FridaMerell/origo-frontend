"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Glossary } from "@/app/lib/dal/opus"
import { useUser } from "@/app/lib/user-context"
import { createGlossary } from "../_actions/glossary-actions"
import { TextField } from "../forms/Fields/Fields"
import Divider from "../ui/Divider"
import GlossaryForm from "./GlossaryForm"

/** Synlig fokusmarkering för tangentbordsnavigering, samma som Opus formulärfält. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

const SMALL_CAPS = "font-body text-xs uppercase tracking-widest text-text-muted"

function GlossaryCard({ glossary }: { glossary: Glossary }) {
	return (
		<li>
			<Link
				href={`/ordlistor/${glossary.id}`}
				className={`group flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md ${FOCUS}`}>
				<h3 className='font-display text-2xl leading-tight text-text first-letter:mr-0.5 first-letter:text-4xl first-letter:leading-none first-letter:text-primary'>
					{glossary.title}
				</h3>
				{glossary.description && (
					<p className='mt-2 line-clamp-3 font-display text-base italic leading-relaxed text-text-muted'>
						{glossary.description}
					</p>
				)}
				<div className='mt-auto flex items-baseline justify-between gap-4 pt-4'>
					<p className={SMALL_CAPS}>
						{glossary.entry_count} ord ·{glossary.is_private ? "Privat" : "Offentlig"}
					</p>
					<span className='shrink-0 font-body text-xs uppercase tracking-widest text-primary'>
						Öppna{" "}
						<span aria-hidden className='inline-block transition-transform duration-300 group-hover:translate-x-1'>
							→
						</span>
					</span>
				</div>
			</Link>
		</li>
	)
}

/** Användarens egna ordlistor och andras offentliga, med ett formulär för att skapa en ny. */
export default function GlossariesView({ glossaries }: { glossaries: Glossary[] }) {
	const user = useUser()
	const router = useRouter()
	const [creating, setCreating] = useState(false)
	const [query, setQuery] = useState("")

	const { own, shared } = useMemo(() => {
		const needle = query.trim().toLocaleLowerCase("sv")
		const shown = needle
			? glossaries.filter(glossary =>
					[glossary.title, glossary.description].join(" ").toLocaleLowerCase("sv").includes(needle),
				)
			: glossaries
		return {
			own: shown.filter(glossary => glossary.owner === user?.id),
			shared: shown.filter(glossary => glossary.owner !== user?.id),
		}
	}, [glossaries, query, user])

	return (
		<>
			<section className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
				<div className='max-w-md'>
					<h1 className='font-display text-3xl font-bold text-text'>Ordlistor</h1>
					<p className='mt-2 text-text-muted'>
						Samla ord och definitioner. Definitioner du skriver i en text kan läggas direkt i dina ordlistor.
					</p>
				</div>
				{glossaries.length > 0 && (
					<div className='w-full sm:w-72'>
						<TextField
							label='Sök bland ordlistor'
							hideLabel
							type='search'
							value={query}
							onChange={event => setQuery(event.target.value)}
							placeholder='Sök på namn eller beskrivning'
						/>
					</div>
				)}
			</section>

			<Divider>
				<span className='font-display italic oldstyle-nums'>Mina ordlistor</span>
			</Divider>
			<ul className='my-6 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3'>
				{own.map(glossary => (
					<GlossaryCard key={glossary.id} glossary={glossary} />
				))}
				<li>
					{creating ? (
						<div className='h-full rounded-lg border border-border bg-surface p-5'>
							<GlossaryForm
								submitLabel='Skapa ordlista'
								onCancel={() => setCreating(false)}
								onSubmit={async data => {
									const glossary = await createGlossary(data)
									router.push(`/ordlistor/${glossary.id}`)
								}}
							/>
						</div>
					) : (
						<button
							type='button'
							onClick={() => setCreating(true)}
							className={`flex h-full min-h-40 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border px-6 py-5 text-center text-text-muted transition-colors duration-300 hover:border-text-muted cursor-pointer ${FOCUS}`}>
							<span aria-hidden className='font-display text-2xl text-primary'>
								+
							</span>
							<span className='font-display text-xl text-text'>Ny ordlista</span>
						</button>
					)}
				</li>
			</ul>

			{shared.length > 0 && (
				<>
					<Divider>
						<span className='font-display italic oldstyle-nums'>Offentliga ordlistor</span>
					</Divider>
					<ul className='my-6 grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3'>
						{shared.map(glossary => (
							<GlossaryCard key={glossary.id} glossary={glossary} />
						))}
					</ul>
				</>
			)}
		</>
	)
}
