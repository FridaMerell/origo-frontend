"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { BookmarkIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/app/components/ui/Button"
import type { Bookmark, Id } from "@/app/lib/dal/opus"
import { removeBookmark, updateBookmark } from "../_actions/bookmark-actions"
import { TextAreaField, TextField } from "../forms/Fields/Fields"
import Divider from "../ui/Divider"

const DATE_FORMAT = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric" })

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
		<li className='rounded-xl border border-border border-l-4 border-l-primary bg-surface p-5'>
			<div className='flex items-baseline justify-between gap-4'>
				<span className='min-w-0 truncate font-mono text-xs uppercase tracking-widest text-text-muted'>{place}</span>
				<time dateTime={bookmark.created_at} className='shrink-0 font-mono text-xs text-text-muted'>
					{DATE_FORMAT.format(new Date(bookmark.created_at))}
				</time>
			</div>
			{bookmark.title && <h3 className='mt-2 font-display text-xl text-text'>{bookmark.title}</h3>}
			<blockquote className='mt-3 border-l-2 border-border pl-4 font-display text-lg leading-relaxed text-text'>
				{bookmark.excerpt}
			</blockquote>
			{bookmark.note && !editing && (
				<p className='mt-3 whitespace-pre-line text-sm leading-relaxed text-text-muted'>{bookmark.note}</p>
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
				<div className='mt-4 flex flex-wrap items-center gap-4 text-sm'>
					<Link
						href={readingHref(bookmark)}
						className='inline-flex items-center gap-1 font-semibold text-primary hover:text-text'>
						Läs härifrån
						<ChevronRightIcon size={14} aria-hidden />
					</Link>
					<button
						type='button'
						onClick={() => setEditing(true)}
						className='text-text-muted underline underline-offset-4 hover:text-text cursor-pointer'>
						{bookmark.title || bookmark.note ? "Redigera" : "Lägg till rubrik eller anteckning"}
					</button>
					<button
						type='button'
						disabled={removing}
						onClick={handleRemove}
						className='ml-auto text-text-muted underline underline-offset-4 hover:text-danger disabled:opacity-40 cursor-pointer'>
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
				<div className='flex max-w-100 flex-col'>
					<span className='font-mono uppercase tracking-widest text-primary'>Läsning</span>
					<h1 className='font-display text-3xl font-bold'>Bokmärken</h1>
					<p className='text-md'>Ställen du har sparat i dina böcker, med egna rubriker och anteckningar.</p>
				</div>
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
				<span className='font-mono text-sm uppercase tracking-wide'>
					{items.length === 0
						? "Inga bokmärken"
						: query.trim()
							? `${shown} av ${items.length} bokmärken`
							: `${items.length} ${items.length === 1 ? "bokmärke" : "bokmärken"}`}
				</span>
			</Divider>

			{items.length === 0 ? (
				<div className='my-10 flex flex-col items-center gap-3 text-center text-text-muted'>
					<BookmarkIcon size={28} className='text-primary/60' aria-hidden />
					<p className='max-w-[42ch] text-sm'>
						Inga bokmärken än. Öppna en bok och klicka på bokmärkesikonen i en rads vänsterkant.
					</p>
					<Link href={"/"} className='text-sm font-semibold text-primary hover:text-text'>
						Till bokhyllan
					</Link>
				</div>
			) : shown === 0 ? (
				<p className='my-10 text-center text-sm text-text-muted'>Inga bokmärken matchar sökningen.</p>
			) : (
				<div className='my-5 flex flex-col gap-10'>
					{groups.map(group => (
						<section key={group.workId} aria-labelledby={`work-${group.workId}`}>
							<div className='mb-4 flex items-baseline justify-between gap-4'>
								<h2 id={`work-${group.workId}`} className='font-display text-2xl text-text'>
									{group.title}
								</h2>
								<Link
									href={`/verk/${group.workId}`}
									className='shrink-0 font-mono text-xs uppercase tracking-widest text-text-muted hover:text-text'>
									Öppna verket
								</Link>
							</div>
							<ol className='flex flex-col gap-4'>
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
