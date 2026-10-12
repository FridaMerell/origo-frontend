"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/Button"
import type { Glossary } from "@/app/lib/dal/opus"
import { useUser } from "@/app/lib/user-context"
import { createGlossary } from "../_actions/glossary-actions"
import { TextField } from "../forms/Fields/Fields"
import Divider from "../ui/Divider"
import GlossaryForm from "./GlossaryForm"

/** Synlig fokusmarkering för tangentbordsnavigering, samma som Opus formulärfält. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

/** En ordlista som en rad i en lista med linjer, som språken i glosförhöret. */
function GlossaryRow({ glossary }: { glossary: Glossary }) {
	return (
		<li className='border-b border-border'>
			<Link
				href={`/ordlistor/${glossary.id}`}
				className={`group grid gap-x-6 gap-y-1 rounded-sm py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline ${FOCUS}`}>
				<div className='min-w-0'>
					<p className='font-display text-xl font-semibold text-text group-hover:text-primary'>{glossary.title}</p>
					{glossary.description && (
						<p className='mt-1 line-clamp-2 font-display italic text-text-muted'>{glossary.description}</p>
					)}
				</div>
				<p className='text-sm text-text-muted oldstyle-nums'>
					{glossary.entry_count} ord · {glossary.is_private ? "Privat" : "Offentlig"}
				</p>
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
			{own.length > 0 && (
				<ul className='flex flex-col'>
					{own.map(glossary => (
						<GlossaryRow key={glossary.id} glossary={glossary} />
					))}
				</ul>
			)}
			<div className='my-6'>
				{creating ? (
					<div className='max-w-xl'>
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
					<Button type='button' variant='secondary' onClick={() => setCreating(true)}>
						Ny ordlista
					</Button>
				)}
			</div>

			{shared.length > 0 && (
				<>
					<Divider>
						<span className='font-display italic oldstyle-nums'>Offentliga ordlistor</span>
					</Divider>
					<ul className='mb-6 flex flex-col'>
						{shared.map(glossary => (
							<GlossaryRow key={glossary.id} glossary={glossary} />
						))}
					</ul>
				</>
			)}
		</>
	)
}
