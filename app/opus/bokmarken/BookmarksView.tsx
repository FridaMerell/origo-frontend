"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { Button } from "@/app/components/ui/Button"
import type { Bookmark, Id } from "@/app/lib/dal/opus"
import { removeBookmark, updateBookmark } from "../_actions/bookmark-actions"
import { TextAreaField, TextField } from "../forms/Fields/Fields"
import Divider from "../ui/Divider"

const DATE_FORMAT = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" })

/** Synlig fokusmarkering för tangentbordsnavigering, samma som Opus formulärfält. */
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"

/** Läsvyn öppnad vid den bokmärkta enheten (se `enhet` i app/opus/verk/[id]/page.tsx). */
function readingHref(bookmark: Bookmark) {
	return `/verk/${bookmark.work.id}?enhet=${bookmark.unit}`
}

function matches(bookmark: Bookmark, query: string) {
	const haystack = [
		bookmark.title,
		bookmark.note,
		bookmark.excerpt,
		bookmark.work.title,
		bookmark.edition_title,
		bookmark.chapter?.label ?? "",
	]
		.join(" ")
		.toLocaleLowerCase("sv")
	return haystack.includes(query.toLocaleLowerCase("sv"))
}

function EditForm({
	bookmark,
	onSaved,
	onCancel,
}: {
	bookmark: Bookmark
	onSaved: (bookmark: Bookmark) => void
	onCancel: () => void
}) {
	const [title, setTitle] = useState(bookmark.title)
	const [note, setNote] = useState(bookmark.note)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setPending(true)
		setError(null)
		try {
			onSaved(await updateBookmark(bookmark.id, { title: title.trim(), note: note.trim() }))
		} catch {
			setError("Bokmärket kunde inte sparas.")
		} finally {
			setPending(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className='mt-3 flex flex-col gap-3'>
			<TextField
				label={"Rubrik"}
				value={title}
				onChange={event => setTitle(event.target.value)}
				maxLength={255}
				placeholder={bookmark.chapter?.label || "Till exempel: Vändpunkten"}
			/>
			<TextAreaField label={"Anteckning"} value={note} onChange={event => setNote(event.target.value)} rows={3} />
			{error && (
				<p role={"alert"} className={"text-sm text-danger"}>
					{error}
				</p>
			)}
			<div className='flex justify-end gap-3'>
				<Button type={"button"} variant={"ghost"} onClick={onCancel}>
					Avbryt
				</Button>
				<Button type={"submit"} disabled={pending}>
					{pending ? "Sparar…" : "Spara"}
				</Button>
			</div>
		</form>
	)
}

function BookmarkCard({
	bookmark,
	onChanged,
	onRemoved,
}: {
	bookmark: Bookmark
	onChanged: (bookmark: Bookmark) => void
	onRemoved: (id: Id) => void
}) {
	const [editing, setEditing] = useState(false)
	const [removing, setRemoving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const place = [bookmark.edition_title, bookmark.chapter?.label].filter(Boolean).join(" · ")

	async function handleRemove() {
		setRemoving(true)
		setError(null)
		try {
			await removeBookmark(bookmark.id)
			onRemoved(bookmark.id)
		} catch {
			setError("Bokmärket kunde inte tas bort.")
			setRemoving(false)
		}
	}

	return (
		<li className='relative flex flex-col rounded-lg border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md'>
			{/* Bokmärkesbandet: ett sidenband som hänger ned över kortets överkant, som i en bok. */}
			<svg aria-hidden viewBox='0 0 16 40' className='absolute -top-px right-5 h-7 w-3 text-primary'>
				<path d='M0 0h16v40l-8-7-8 7z' fill='currentColor' />
			</svg>
			<div className='flex items-baseline justify-between gap-4 pr-8'>
				<span className='min-w-0 truncate font-display text-sm italic text-text-muted'>{place}</span>
				<time dateTime={bookmark.created_at} className='shrink-0 font-display text-sm text-text-muted oldstyle-nums'>
					{DATE_FORMAT.format(new Date(bookmark.created_at))}
				</time>
			</div>
			{bookmark.title && <h3 className='mt-2 font-display text-xl text-text'>{bookmark.title}</h3>}
			<blockquote className='mt-2 font-display text-lg italic leading-relaxed text-text'>
				<span aria-hidden className='text-primary'>”</span>
				{bookmark.excerpt}
				<span aria-hidden className='text-primary'>”</span>
			</blockquote>
			{bookmark.note && !editing && (
				// Anteckningen är ens egen text: infälld i kortet, skild från bokens.
				<p className='mt-3 whitespace-pre-line rounded-md bg-bg px-3 py-2 font-display text-sm italic leading-relaxed text-text-muted'>
					{bookmark.note}
				</p>
			)}
			{editing ? (
				<EditForm
					bookmark={bookmark}
					onSaved={saved => {
						onChanged(saved)
						setEditing(false)
					}}
					onCancel={() => setEditing(false)}
				/>
			) : (
				<div className='mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 text-sm'>
					<Link
						href={readingHref(bookmark)}
						className={`rounded-sm font-semibold text-primary underline underline-offset-4 hover:text-text ${FOCUS}`}>
						Läs härifrån
					</Link>
					<button
						type='button'
						onClick={() => setEditing(true)}
						className={`rounded-sm text-text-muted underline underline-offset-4 hover:text-text cursor-pointer ${FOCUS}`}>
						{bookmark.title || bookmark.note ? "Redigera" : "Lägg till rubrik eller anteckning"}
					</button>
					<button
						type='button'
						disabled={removing}
						onClick={handleRemove}
						className={`ml-auto rounded-sm text-text-muted underline underline-offset-4 hover:text-danger disabled:opacity-40 cursor-pointer ${FOCUS}`}>
						{removing ? "Tar bort…" : "Ta bort"}
					</button>
				</div>
			)}
			{error && (
				<p role={"alert"} className={"mt-2 text-sm text-danger"}>
					{error}
				</p>
			)}
		</li>
	)
}

/** Alla användarens bokmärken, grupperade per verk (nyast först inom varje verk). */
export default function BookmarksView({ bookmarks }: { bookmarks: Bookmark[] }) {
	const [items, setItems] = useState(bookmarks)
	const [query, setQuery] = useState("")

	const groups = useMemo(() => {
		const trimmed = query.trim()
		const byWork = new Map<Id, { title: string; bookmarks: Bookmark[] }>()
		for (const bookmark of items) {
			if (trimmed && !matches(bookmark, trimmed)) continue
			const group = byWork.get(bookmark.work.id) ?? { title: bookmark.work.title, bookmarks: [] }
			group.bookmarks.push(bookmark)
			byWork.set(bookmark.work.id, group)
		}
		return [...byWork.entries()].map(([workId, group]) => ({ workId, ...group }))
	}, [items, query])

	const shown = groups.reduce((sum, group) => sum + group.bookmarks.length, 0)

	return (
		<>
			<section className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
				<h1 className='font-display text-3xl font-bold text-text'>Bokmärken</h1>
				{items.length > 0 && (
					<div className='w-full sm:w-72'>
						<TextField
							label={"Sök bland bokmärken"}
							hideLabel
							type={"search"}
							value={query}
							onChange={event => setQuery(event.target.value)}
							placeholder={"Sök i text, rubrik eller anteckning"}
						/>
					</div>
				)}
			</section>
			<Divider>
				<span className='font-display italic oldstyle-nums'>
					{items.length === 0
						? "Inga bokmärken"
						: query.trim()
							? `${shown} av ${items.length} bokmärken`
							: `${items.length} ${items.length === 1 ? "bokmärke" : "bokmärken"}`}
				</span>
			</Divider>

			{items.length === 0 ? (
				<p className='my-10 text-center font-display text-lg text-text-muted'>
					Inga bokmärken än. Öppna en bok och klicka på bokmärket vid en rad.{" "}
					<Link href={"/"} className={`rounded-sm text-primary underline underline-offset-4 hover:text-text ${FOCUS}`}>
						Till bokhyllan
					</Link>
				</p>
			) : shown === 0 ? (
				<p className='my-10 text-center font-display text-lg italic text-text-muted'>Inga bokmärken matchar sökningen.</p>
			) : (
				<div className='my-6 flex flex-col gap-10'>
					{groups.map(group => (
						<section key={group.workId} aria-labelledby={`work-${group.workId}`}>
							<div className='mb-3 flex items-baseline justify-between gap-4'>
								{/* Anfang: begynnelsebokstaven i rött, dubbelt så stor som resten av titeln. */}
								<h2
									id={`work-${group.workId}`}
									className='font-display text-2xl text-text first-letter:mr-0.5 first-letter:text-5xl first-letter:leading-none first-letter:text-primary'>
									{group.title}
								</h2>
								<Link
									href={`/verk/${group.workId}`}
									className={`shrink-0 rounded-sm font-display italic text-text-muted underline underline-offset-4 hover:text-text ${FOCUS}`}>
									Öppna verket
								</Link>
							</div>
							<ol className='grid gap-4 md:grid-cols-2'>
								{group.bookmarks.map(bookmark => (
									<BookmarkCard
										key={bookmark.id}
										bookmark={bookmark}
										onChanged={saved =>
											setItems(current => current.map(item => (item.id === saved.id ? saved : item)))
										}
										onRemoved={id => setItems(current => current.filter(item => item.id !== id))}
									/>
								))}
							</ol>
						</section>
					))}
				</div>
			)}
		</>
	)
}
