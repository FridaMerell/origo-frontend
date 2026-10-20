import { Metadata } from "next"
import { alignmentSetApi, glossaryApi, readingProgressApi, sourceFileApi, workApi } from "../../_actions/actions"
import { listBookmarks, listWorkBookmarks } from "../../_actions/bookmark-actions"
import "./page.css"
import { Work } from "@/app/lib/dal/opus"
import React from "react"
import AlignmentBootstrap from "./_work/AlignmentBootstrap"
import ParallelReader from "./_reader/ParallelReader"
import { OpusReadingProvider } from "../../_state/opus-context"
import Indexes from "./_work/Indexes"
import BookmarksList from "./_work/BookmarksList"
import AddEdition from "./_work/AddEdition"
import DeleteWork from "./_work/DeleteWork"
import KeepPositionToggle from "./_work/KeepPositionToggle"
import { EDITION_COLORS, PAGE_SIZE } from "./_ui/editions"
import { getCurrentUser } from "@/app/lib/dal"
import { notFound } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: number }>
}): Promise<Metadata> {
	const { id } = await params

	const work = id ? await workApi.retrieve(id).catch(() => null) : null

	return {
		title: `${work?.title ?? "Verket finns inte"} | Origo Opus`,
		description: work ? work.title : "Läs copyrightfria böcker i Opus",
	}
}

export default async function WorkPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: number }>
	/** `enhet`: öppna vid den textenheten (t.ex. från bokmärkessidan) i stället för läspositionen. */
	searchParams: Promise<{ enhet?: string }>
}) {
	const { id } = await params
	const { enhet } = await searchParams
	const focusUnit = enhet && /^\d+$/.test(enhet) ? Number(enhet) : undefined
	// Ett verk som inte finns (eller inte är synligt) ger 404 från API:t: visa not-found, inte en kraschsida.
	const user = await getCurrentUser()
	const [work, reading, alignmentSets, ownGlossaries] = await Promise.all([
		workApi.retrieve(id),
		readingProgressApi.retrieve(id),
		alignmentSetApi.list({ work: String(id) }),
		// Ordpanelen i texten väljer bland dem; läsvyn fungerar även om de inte går att hämta.
		user ? glossaryApi.list({ owner: String(user.id) }).catch(() => []) : [],
	]).catch(error => {
		if (error instanceof Error && error.message.startsWith("404")) notFound()
		throw error
	})

	// Raderna i tabellen styrs av alignment-rutnätet (en cell eller lucka per edition och rad),
	// inte av textenheternas position — annars hamnar editions med olika indelning fel mot varandra.
	const alignmentSet = alignmentSets[0] ?? null
	const matrix = alignmentSet
		? await alignmentSetApi.matrix(alignmentSet.id, 0, PAGE_SIZE, focusUnit ? undefined : "reading", focusUnit)
		: null
	// Bokmärken hör till en edition (den första kolumnen, samma referens som läspositionen).
	const referenceEditionId = matrix?.versions[0]?.text_version
	const bookmarks = referenceEditionId ? await listBookmarks(referenceEditionId) : []
	// Alla bokmärken i verket (alla editions), för listan i "Bokmärken"-chippen.
	const workBookmarks = await listWorkBookmarks(reading.editions.map(edition => ({ id: edition.id, title: edition.title })))
	// En utgåva utan källfil och utan kapitel/stycken har ingen text än; dess index erbjuder import.
	// Servern avgör ändå (en utgåva med text avvisar en ny import).
	const sourceFiles = await Promise.all(
		reading.editions.map(edition => sourceFileApi.list({ version: String(edition.id) })),
	)
	const hasText = (index: number) =>
		sourceFiles[index].length > 0 ||
		reading.editions[index].chapters.length > 0 ||
		reading.editions[index].units.length > 0
	// Setet ska ha en kolumn per utgåva: saknas setet, eller en utgåva som lagts till senare
	// (t.ex. av någon annan i ett offentligt verk), kompletteras det.
	const needsBootstrap =
		reading.editions.length > 0 &&
		(!matrix || reading.editions.some(edition => !matrix.versions.some(version => version.text_version === edition.id)))

	const meta = []

	if (work.contributors.length > 0) {
		meta.push(
			work.contributors
				.filter(c => c.role === "author")
				.map(c => c.author.name)
				.join(", "),
		)
	}

	if (work.year) {
		meta.push(work.year)
	}

	async function removeWork(work: Work) {
		"use server"

		await workApi.remove(work.id)
		// Startsidans verklista (tenantens interna rutt) ska inte visa det raderade verket.
		revalidatePath("/opus")
	}

	return (
		<OpusReadingProvider readingProgress={reading} ownGlossaries={ownGlossaries}>
			<AlignmentBootstrap workId={id} needsBootstrap={needsBootstrap} />
			{/* Verkets titelblad: författare och år, titeln med anfang, utgåvorna, och inställningar längst ned. */}
			<section className={"mb-8 rounded-xl border border-border bg-surface px-5 pt-6 pb-4 shadow-md sm:px-8 sm:pt-8"}>
				<p className={"font-body text-xs uppercase tracking-widest text-text-muted"}>{meta.join(" · ") || " "}</p>
				<h1
					className={
						"mt-2 break-words font-display text-4xl font-semibold leading-tight tracking-tight text-text first-letter:mr-1 first-letter:text-6xl first-letter:font-bold first-letter:leading-none first-letter:text-primary sm:text-6xl sm:first-letter:text-8xl"
					}>
					{work.title}
				</h1>
				<div className={"mt-6 flex flex-wrap items-center gap-2"}>
					{reading.editions.map((edition, i) => {
						return <Indexes workId={work.id} edition={edition} key={i} color={EDITION_COLORS[i]} hasText={hasText(i)} />
					})}
					<BookmarksList bookmarks={workBookmarks} />
					<AddEdition workId={work.id} />
				</div>
				<div className={"mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-border pt-4"}>
					<KeepPositionToggle />
					<div className={"ml-auto"}>
						<DeleteWork onDelete={removeWork.bind(null, work)} />
					</div>
				</div>
			</section>

			{matrix ? (
				<ParallelReader
					workId={work.id}
					initial={matrix}
					initialBookmarks={bookmarks}
					editions={reading.editions.map(edition => ({
						id: edition.id,
						title: edition.title,
						language: edition.language,
						chapters: edition.chapters.map(chapter => ({ id: chapter.id, label: chapter.label })),
					}))}
				/>
			) : reading.editions.length === 0 ? (
				<p className={"py-10 text-text-muted"}>Verket har inga utgåvor än. Lägg till en utgåva för att börja läsa.</p>
			) : (
				<p className={"py-10 text-text-muted"}>Förbereder läsvyn…</p>
			)}
		</OpusReadingProvider>
	)
}
